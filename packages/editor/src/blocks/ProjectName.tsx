import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'
import { blurOnEnter } from './inputCommit'

/** Block: the project name. Landmark: a group named "Project name". */
export default function ProjectName() {
  const props = useAppController()

  return (
    <div class="block" data-block="project-name" role="group" aria-label="Project name">
      <div class="section-label">Name <SectionHelp anchor="help-project-name" /></div>
      <input
        class="input-field"
        value={props.project.projectMeta.name}
        placeholder="Project name..."
        onInput={(event) => props.onSetProjectName(event.currentTarget.value)}
        onKeyDown={blurOnEnter(props)}
      />
    </div>
  )
}
