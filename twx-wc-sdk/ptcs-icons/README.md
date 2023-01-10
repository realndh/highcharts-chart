# ptcs-icons

## Overview

The ptcs-icons directory includes imports for predefined icon sets that can be loaded into your project.

## Usage

Icon sets are JS files that are named **[iconset-name]-icons.js**. Each file contains a list of predefined icons and every icon has a unique id:
 ```xml
 <g id="[icon-id]"><path part...
 ```

To use the icons in a component, you must import the corresponding icon set, e.g.:
```javascript
import '[path_to_component]/ptcs-icons/cds-icons.js';
```

You can use a specific icon from the icon set to populate the icon property of ptcs-icon or iron-icon component:
```xml
<ptcs-icon icon="[iconset-name]:[icon-id]"></ptcs-icon>
```
`ptcs-icon` supports default icons from the iron-icon icon set, simply leave out the `iconset-name:` prefix in such case.