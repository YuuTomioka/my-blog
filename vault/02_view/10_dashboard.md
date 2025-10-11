---
tags:
  - dashboard
---
## View
```base
views:
  - type: table
    name: all
    filters:
      and:
        - file.path.contains("02_view")
    order:
      - file.name
      - file.tags
      - file.ext
  - type: table
    name: bases
    filters:
      and:
        - file.folder.contains("02_view")
        - file.ext == "base"
    order:
      - file.name
    sort:
      - property: file.links
        direction: ASC
      - property: file.folder
        direction: DESC
  - type: table
    name: tasks
    filters:
      and:
        - file.folder.contains("02_view")
        - file.hasTag("task")
    order:
      - file.name
    sort:
      - property: file.links
        direction: ASC
      - property: file.folder
        direction: DESC

```

## Today | Pin
```base
formulas:
  backlinks: file.backlinks.map(if(value.asFile(), value.asFile().asLink(value.asFile().name.replace(/\.[^\.]+$/, "")), null)).unique().filter(value)
  last_edit: file.mtime.relative()
properties:
  formula.backlinks:
    displayName: backlinks
  formula.last_edit:
    displayName: last edit
views:
  - type: table
    name: today
    filters:
      and:
        - file.inFolder("01_data/" + today().format("YYYY/MM/DD"))
    order:
      - file.name
      - file.tags
      - file.ext
      - file.links
      - formula.backlinks
      - formula.last_edit
    sort:
      - property: file.mtime
        direction: DESC
  - type: table
    name: pin
    filters:
      and:
        - file.path.contains("01_data")
        - file.hasTag("Pin")
    order:
      - file.name
      - file.tags
      - file.ext
      - file.links
      - formula.backlinks
      - formula.last_edit
    sort:
      - property: file.mtime
        direction: DESC

```

## Data
```base
formulas:
  backlinks: file.backlinks.map(if(value.asFile(), value.asFile().asLink(value.asFile().name.replace(/\.[^\.]+$/, "")), null)).unique().filter(value)
  last_edit: file.mtime.relative()
properties:
  formula.backlinks:
    displayName: backlinks
  formula.last_edit:
    displayName: last edit
views:
  - type: table
    name: all
    filters:
      and:
        - file.folder.contains("01_data")
    order:
      - file.name
      - file.tags
      - file.ext
      - file.links
      - formula.backlinks
      - formula.last_edit
    sort:
      - property: file.mtime
        direction: DESC
  - type: table
    name: notes
    filters:
      and:
        - file.folder.contains("01_data")
        - file.ext == "md"
    order:
      - file.name
      - file.tags
      - file.links
      - formula.backlinks
      - formula.last_edit
    sort:
      - property: file.mtime
        direction: DESC
  - type: table
    name: assets
    filters:
      and:
        - file.folder.contains("01_data")
        - file.ext != "md"
    order:
      - file.name
      - file.ext
      - formula.backlinks
      - formula.last_edit
    sort:
      - property: file.mtime
        direction: DESC
  - type: table
    name: past
    filters:
      and:
        - file.folder.contains("01_data")
        - '!file.inFolder("01_data/" + today().format("YYYY/MM/DD"))'
    order:
      - file.name
      - file.tags
      - file.ext
      - file.links
      - formula.backlinks
      - formula.last_edit
    sort:
      - property: file.mtime
        direction: DESC

```
