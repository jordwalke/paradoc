declare global {
  interface Window { BookmarkTemplate: any; }
}

window.BookmarkTemplate = window.BookmarkTemplate || {};

interface MarkdownAndHeader {
  markdown: string;
  headerProps: Record<string, any>
}
interface PageState {
  fetcher: any;
  markdownAndHeader: MarkdownAndHeader
}

interface RunnerBase {
  discoveredToBePrerenderedAtUrl: null | any;
  discoveredToBePrerenderedPageKey: null | any;
  highlight: (code: string, value: string) => string,
  pageState: { [key: string]: any },
  pageTemplateOptions: any,
  stylusFetcher: any
}

interface Runner extends RunnerBase {
  setupPage: () => void;
  setupSearch: () => void;
}
