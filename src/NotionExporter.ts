import axios, { AxiosInstance } from "axios"
import AdmZip from "adm-zip"

import { blockIdFromUrl, validateUuid } from "./blockId"

interface Task {
  id: string
  state: string
  status: { exportURL?: string }
}

/** Lightweight client to export ZIP, Markdown or CSV files from a Notion block/page. */
export class NotionExporter {
  protected readonly client: AxiosInstance

  /**
   * Create a new NotionExporter client. To export any blocks/pages from
   * Notion.so one needs to provide the token of a user who has read access to
   * the corresponding pages.
   *
   * @param token – the Notion 'token_v2' Cookie value
   */
  constructor(token: string) {
    this.client = axios.create({
      baseURL: "https://www.notion.so/api/v3/",
      headers: {
        Cookie: `token_v2=${token}; `,
      },
    })
  }

  /**
   * Adds a an 'exportBlock' task to the Notion API's queue of tasks.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The task's id
   */
  async getTaskId(idOrUrl: string): Promise<string> {
    const id = validateUuid(blockIdFromUrl(idOrUrl))
    if (!id) return Promise.reject(`Invalid URL or blockId: ${idOrUrl}`)

    const res = await this.client.post("enqueueTask", {
      task: {
        eventName: "exportBlock",
        request: {
          block: { id },
          recursive: false,
          exportOptions: {
            exportType: "markdown",
            timeZone: "Europe/Zurich",
            locale: "en",
          },
        },
      },
    })
    return res.data.taskId
  }

  private getTask = async (taskId: string): Promise<Task> => {
    const res = await this.client.post("getTasks", { taskIds: [taskId] })
    return res.data.results.find((t: Task) => t.id === taskId)
  }

  private pollTask = (
    taskId: string,
    pollInterval: number = 50
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const poll = async () => {
        const task = await this.getTask(taskId)
        if (task.state === "success" && task.status.exportURL)
          resolve(task.status.exportURL)
        else if (task.state === "in_progress") setTimeout(poll, pollInterval)
        else reject("Export task failed.")
      }
      setTimeout(poll, pollInterval)
    })

  /**
   * Starts an export of the given block and
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The URL of the exported ZIP archive
   */
  getZipUrl = (idOrUrl: string): Promise<string> =>
    this.getTaskId(idOrUrl).then(this.pollTask)

  /**
   * Downloads the ZIP at the given URL.
   *
   * @returns The ZIP as an 'AdmZip' object
   */
  getZip = async (url: string): Promise<AdmZip> => {
    const res = await this.client.get(url, { responseType: "arraybuffer" })
    return new AdmZip(res.data)
  }

  /**
   * Exports the given block as ZIP and downloads it. Returns the matched file
   * in the ZIP as a string.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @param predicate - Returns true for the zip entry to be extracted
   * @returns The matched file as string
   */
  async getFileString(
    idOrUrl: string,
    predicate: (entry: AdmZip.IZipEntry) => boolean
  ): Promise<string> {
    const zip = await this.getZipUrl(idOrUrl).then(this.getZip)
    const entries = zip.getEntries()
    const entry = entries.find(predicate)
    return (
      entry?.getData().toString().trim() ||
      Promise.reject("Could not find file in ZIP.")
    )
  }

  /**
   * Downloads and extracts the first CSV file of the exported block as string.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The extracted CSV string
   */
  getCsvString = (idOrUrl: string): Promise<string> =>
    this.getFileString(idOrUrl, (e) => e.name.endsWith(".csv"))

  /**
   * Downloads and extracts the first Markdown file of the exported block as string.
   *
   * @param idOrUrl BlockId or URL of the page/block/DB to export
   * @returns The extracted Markdown string
   */
  getMdString = (idOrUrl: string): Promise<string> =>
    this.getFileString(idOrUrl, (e) => e.name.endsWith(".md"))
}
