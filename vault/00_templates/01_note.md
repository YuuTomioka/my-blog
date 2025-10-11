---
created: <% tp.date.now("YYYY-MM-DD HH:mm:ss") %>
tags:
---
<%*
const CONFIG = {
  BASE_FOLDER: "01_data",
  DATE_FORMAT: "YYYY/MM/DD",
  TITLE: ""  // ここに任意のタイトルを設定。空欄("")の場合はデフォルトのファイル名を使用
}

const createFolderIfNotExists = async (path) => {
  try {
    await app.vault.createFolder(path)
  } catch {
    // フォルダが既に存在
  }
}

const getUniqueName = async (folder, base) => {
  let name = base
  let i = 1
  while (app.vault.getAbstractFileByPath(`${folder}/${name}.md`)) {
    name = `${base} ${i++}`
  }
  return name
}

const moveFileToFolder = async (fileTitle, folder) => {
  await createFolderIfNotExists(folder)
  const uniqueName = await getUniqueName(folder, fileTitle)
  await tp.file.move(`${folder}/${uniqueName}`)
  return uniqueName
}

const notifyIfRenamed = (original, newName) => {
  if (original !== newName) {
    new Notice(`ファイル名が重複していたため "${newName}" に変更されました`)
  }
}

const generateFileName = (title) => {
  if (title && title.trim() !== "") {
    const dateStr = tp.date.now("YYYY-MM-DD")
    return `${title.trim()}_${dateStr}`
  } else {
    return tp.file.title
  }
}

try {
  const folderPath = `${CONFIG.BASE_FOLDER}/${tp.date.now(CONFIG.DATE_FORMAT)}`
  const originalName = tp.file.title
  const newFileName = generateFileName(CONFIG.TITLE)
  const finalName = await moveFileToFolder(newFileName, folderPath)
  notifyIfRenamed(newFileName, finalName)
} catch (error) {
  new Notice(`エラー: ${error.message}`)
}
%>