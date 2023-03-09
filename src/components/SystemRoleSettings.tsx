import { Show } from 'solid-js'
import type { Accessor, Setter } from 'solid-js'
import IconEnv from './icons/Env'

interface Props {
  canEdit: Accessor<boolean>
  systemRoleEditing: Accessor<boolean>
  setSystemRoleEditing: Setter<boolean>
  currentSystemRoleSettings: Accessor<string>
  setCurrentSystemRoleSettings: Setter<string>
}

export default (props: Props) => {
  let systemInputRef: HTMLTextAreaElement

  const handleButtonClick = () => {
    props.setCurrentSystemRoleSettings(systemInputRef.value)
    props.setSystemRoleEditing(false)
  }

  return (
    <div class="my-4">
      <Show when={!props.systemRoleEditing()}>
        <Show when={props.currentSystemRoleSettings()}>
          <div>
            <div class="fi gap-1 op-50 dark:op-60">
              <IconEnv />
              <span>指定角色:</span>
            </div>
            <div class="mt-1">
              { props.currentSystemRoleSettings() }
            </div>
          </div>
        </Show>
        <Show when={!props.currentSystemRoleSettings() && props.canEdit()}>
          <span onClick={() => props.setSystemRoleEditing(!props.systemRoleEditing())} class="sys-edit-btn">
            <IconEnv />
            <span>指定系统角色</span>
          </span>
        </Show>
      </Show>
      <Show when={props.systemRoleEditing() && props.canEdit()}>
        <div>
          <div class="fi gap-1 op-50 dark:op-60">
            <IconEnv />
            <span>系统角色:</span>
          </div>
          <p class="my-2 leading-normal text-slate text-sm op-60">让GPT扮演你指定的角色</p>
          <div>
            <textarea
              ref={systemInputRef!}
              placeholder="你是一个专业的IT架构师,请尽可能详细的回答我的问题。"
              autocomplete="off"
              autofocus
              rows="3"
              gen-textarea
            />
          </div>
          <button onClick={handleButtonClick} h-12 px-4 py-2 bg-slate bg-op-15 hover:bg-op-20 rounded-sm>
            Set
          </button>
        </div>
      </Show>
    </div>
  )
}
