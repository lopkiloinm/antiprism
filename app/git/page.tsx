import { GitHubDesktopSidebar } from '../../components/GitHubDesktopSidebar'
import './page.css'

export default function GitPage() {
  return (
    <div className="git-page">
      <GitHubDesktopSidebar repositoryPath="." />
    </div>
  )
}
