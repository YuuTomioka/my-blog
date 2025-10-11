---
tags:
  - task
---
## Tasks
```dataviewjs
const ROOT_DIR = "01_data";

const FILTER_TAGS = ["sample"];

const EXCLUDE_TAGS = [];

const stringPool = new Map();

const pooledString = (str) => {
    if (stringPool.has(str)) return stringPool.get(str);
    stringPool.set(str, str);
    return str;
};

const createFileLink = (path, name) => pooledString(`[[${path}|${name}]]`);

const formatDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const buildQuery = () => {
    let query = `"${ROOT_DIR}"`;
    
    if (FILTER_TAGS && FILTER_TAGS.length > 0) {
        const tagQuery = FILTER_TAGS.map(tag => `#${tag}`).join(' or ');
        query += ` and (${tagQuery})`;
    }
    
    if (EXCLUDE_TAGS && EXCLUDE_TAGS.length > 0) {
        const excludeQuery = EXCLUDE_TAGS.map(tag => `-#${tag}`).join(' and ');
        query += ` and ${excludeQuery}`;
    }
    
    return query;
};

const buildFilterText = () => {
    const filterParts = [];
    
    if (FILTER_TAGS && FILTER_TAGS.length > 0) {
        filterParts.push(`含む: #${FILTER_TAGS.join(' #')}`);
    }
    
    if (EXCLUDE_TAGS && EXCLUDE_TAGS.length > 0) {
        filterParts.push(`除外: #${EXCLUDE_TAGS.join(' #')}`);
    }
    
    return filterParts.length > 0 ? `${filterParts.join(' , ')}` : "";
};

const collectTasksFromPages = (pages) => {
    const pendingTasks = [];
    const completedTasks = [];
    
    pages.forEach(page => {
        const tasks = page.file.tasks?.array() || [];
        
        tasks.forEach(task => {
            const taskData = {
                file: {
                    path: page.file.path,
                    name: page.file.name
                },
                text: task.text,
                mtime: page.file.mtime
            };
            
            if (task.completed) {
                completedTasks.push(taskData);
            } else if (task.task) {
                pendingTasks.push(taskData);
            }
        });
    });
    
    const sortByMtime = (a, b) => new Date(b.mtime) - new Date(a.mtime);
    pendingTasks.sort(sortByMtime);
    completedTasks.sort(sortByMtime);
    
    return { pendingTasks, completedTasks };
};

const renderTaskSection = (title, tasks, emoji) => {
    dv.header(3, `${emoji} ${title}`);
    
    if (tasks.length === 0) {
        dv.paragraph(`${title}はありません`);
        return;
    }

    const tableData = tasks.map(task => [
        createFileLink(task.file.path, task.file.name),
        task.text,
        formatDateTime(new Date(task.mtime))
    ]);
    
    dv.table(["ファイル", "タスク内容", "最終更新日時"], tableData);
};

const executeTaskExtraction = () => {
    try {
        const query = buildQuery();
        const pages = dv.pages(query).array();
        
        const { pendingTasks, completedTasks } = collectTasksFromPages(pages);
        
        const filterText = buildFilterText();
        dv.paragraph(`${filterText}`);

        const totalTasks = pendingTasks.length + completedTasks.length;
        if (totalTasks === 0) {
            dv.paragraph("該当するタスクが見つかりませんでした");
            dv.paragraph(`検索対象: ${pages.length}件のファイル`);
            return;
        }

        dv.paragraph(`合計 **${totalTasks}**件 (未完了: **${pendingTasks.length}**件、完了済み: **${completedTasks.length}**件)`);

        renderTaskSection("未完了", pendingTasks, "📋");
        
        renderTaskSection("完了済み", completedTasks, "✅");

    } catch (error) {
        dv.paragraph(`エラーが発生しました: ${error.message}`);
        console.error('DataviewJS エラー:', error);
    } finally {
        stringPool.clear();
    }
};

executeTaskExtraction();
```

## Notes
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
        - file.hasTag("sample")
    order:
      - file.name
      - file.tags
      - file.links
      - formula.backlinks
      - formula.last_edit
    sort:
      - property: file.mtime
        direction: DESC
```
