# Component Renamer 🏷️

A powerful, high-performance Figma plugin that allows you to bulk rename components and component sets, and update their descriptions using structured CSV or JSON mapping files. Designed with a sleek dark-mode glassmorphic user interface and real-time validation feedback.

---

## Features

- 📁 **CSV & JSON Import**: Drag-and-drop or select mapping files containing rename schemes.
- 🔍 **Real-time Validation**: Validates file structure and warns you of duplicates or missing fields before execution.
- ⚙️ **Custom Options**:
  - Toggle between renaming components, updating descriptions, or both.
  - Target individual **Components**, **Component Sets**, or both.
  - Automatically force **lowercase names** or **hyphenate spaces**.
- 🛡️ **Dry Run Mode**: Preview rename operations and view detailed execution reports without modifying any actual components.
- ↩️ **Instant Undo**: Easily revert the entire rename transaction in one click.
- 📊 **Detailed Reporting**: Download a CSV report summarizing exactly what succeeded, what was not found, and what duplicates were detected.

---

## File Format Specifications

You can upload either a `.csv` or `.json` file containing your renaming instructions.

### CSV Format
The CSV must include headers named `current_name` and `new_name`. An optional `description` column can also be provided.

```csv
current_name,new_name,description
"Button / Primary","Button / Default","Primary button for forms"
"Input/Text","Input/Default","Standard text input field"
```

### JSON Format
The JSON file must be a root-level array containing objects with `current_name`, `new_name`, and optionally `description`.

```json
[
  {
    "current_name": "Button / Primary",
    "new_name": "Button / Default",
    "description": "Primary button for forms"
  },
  {
    "current_name": "Input/Text",
    "new_name": "Input/Default",
    "description": "Standard text input field"
  }
]
```

---

## Local Development Setup

To build and run this plugin locally in Figma:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/enamulkhanbd/component-renamer.git
   cd component-renamer
   ```

2. **Install Dependencies**:
   Ensure you have [Node.js](https://nodejs.org/) installed.
   ```bash
   npm install
   ```

3. **Build the Plugin**:
   Compile TypeScript to JavaScript:
   ```bash
   npm run build
   ```
   Or watch for changes during development:
   ```bash
   npm run watch
   ```

4. **Add to Figma**:
   - Open the Figma desktop app.
   - Go to **Plugins** -> **Development** -> **Import plugin from manifest...**.
   - Select the `manifest.json` file in this directory.

---

## License

This project is licensed under the MIT License.