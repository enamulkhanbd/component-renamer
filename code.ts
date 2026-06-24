// Show the UI
figma.showUI(__html__, { width: 420, height: 600, themeColors: true });

interface Mapping {
  current_name: string;
  new_name: string;
  description: string;
}

interface RenameConfig {
  rename: boolean;
  description: boolean;
  componentSets: boolean;
  components: boolean;
  lowercase: boolean;
  hyphenate: boolean;
  dryRun: boolean;
}

interface UndoItem {
  id: string;
  oldName: string;
  oldDescription: string;
}

// Global in-memory undo snapshot
let lastUndoSnapshot: UndoItem[] = [];

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'run-update') {
    const mappings: Mapping[] = msg.mappings;
    const config: RenameConfig = msg.config;

    try {
      // Find all target nodes in the document
      const types: ("COMPONENT" | "COMPONENT_SET")[] = [];
      if (config.components) types.push("COMPONENT");
      if (config.componentSets) types.push("COMPONENT_SET");

      if (types.length === 0) {
        figma.ui.postMessage({
          type: 'update-completed',
          results: [{ status: 'error', message: 'No node types selected. Check "Include Components" or "Include Component Sets".' }],
          stats: { updated: 0, notFound: 0, duplicates: 0 },
          hasUndo: false,
          config
        });
        return;
      }

      // Query document for components
      const allNodes = figma.root.findAllWithCriteria({ types: types });
      
      // Build a map of name -> nodes to quickly find targets and detect duplicate components in document
      const docNodesMap = new Map<string, (ComponentNode | ComponentSetNode)[]>();
      for (const node of allNodes) {
        const list = docNodesMap.get(node.name) || [];
        list.push(node);
        docNodesMap.set(node.name, list);
      }

      const results: { status: 'success' | 'warning' | 'error'; message: string; currentName?: string; newName?: string }[] = [];
      const newUndoSnapshot: UndoItem[] = [];
      
      let updatedCount = 0;
      let notFoundCount = 0;
      let duplicateCount = 0;

      // Track duplicate names in the document (warn once per duplicate name)
      const warnedDuplicates = new Set<string>();

      for (const mapping of mappings) {
        const currentName = mapping.current_name;
        let newName = mapping.new_name;

        // Apply string transformation settings
        if (config.lowercase) {
          newName = newName.toLowerCase();
        }
        if (config.hyphenate) {
          newName = newName.replace(/\s+/g, '-');
        }

        const nodes = docNodesMap.get(currentName);

        if (!nodes || nodes.length === 0) {
          notFoundCount++;
          results.push({
            status: 'warning',
            message: `✗ '${currentName}' not found in document`,
            currentName
          });
          continue;
        }

        // Warn if multiple components in document have the same current name
        if (nodes.length > 1 && !warnedDuplicates.has(currentName)) {
          duplicateCount += (nodes.length - 1);
          warnedDuplicates.add(currentName);
          results.push({
            status: 'error',
            message: `✗ Duplicate component names detected for '${currentName}' (${nodes.length} instances found)`,
            currentName
          });
        }

        // Apply changes to all matched nodes
        for (const node of nodes) {
          if (!config.dryRun) {
            // Save original state for undo
            newUndoSnapshot.push({
              id: node.id,
              oldName: node.name,
              oldDescription: (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') ? node.description : ''
            });

            // Perform updates
            if (config.rename) {
              node.name = newName;
            }
            if (config.description) {
              node.description = mapping.description || '';
            }
          }

          updatedCount++;
          results.push({
            status: 'success',
            message: `✓ '${currentName}' → '${newName}'` + (config.description && mapping.description ? ` (desc: "${mapping.description}")` : ''),
            currentName,
            newName
          });
        }
      }

      // If this wasn't a dry run, save the undo snapshot
      if (!config.dryRun && newUndoSnapshot.length > 0) {
        lastUndoSnapshot = newUndoSnapshot;
      }

      // Post results back to UI
      figma.ui.postMessage({
        type: 'update-completed',
        results: results,
        stats: {
          updated: updatedCount,
          notFound: notFoundCount,
          duplicates: duplicateCount
        },
        hasUndo: lastUndoSnapshot.length > 0,
        config
      });

    } catch (err: any) {
      figma.notify(`Error updating components: ${err.message}`, { error: true });
      figma.ui.postMessage({
        type: 'update-completed',
        results: [{ status: 'error', message: `Internal Error: ${err.message}` }],
        stats: { updated: 0, notFound: 0, duplicates: 0 },
        hasUndo: false,
        config
      });
    }
  }

  if (msg.type === 'undo-update') {
    if (lastUndoSnapshot.length === 0) {
      figma.notify('No undo snapshot available.', { error: true });
      return;
    }

    try {
      let undoneCount = 0;
      for (const item of lastUndoSnapshot) {
        const node = figma.getNodeById(item.id);
        if (node && (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET')) {
          node.name = item.oldName;
          node.description = item.oldDescription;
          undoneCount++;
        }
      }
      
      // Clear snapshot after undo
      lastUndoSnapshot = [];
      
      figma.notify(`Restored ${undoneCount} components to their original state.`);
      figma.ui.postMessage({ type: 'undo-completed' });
    } catch (err: any) {
      figma.notify(`Failed to undo: ${err.message}`, { error: true });
    }
  }
};
