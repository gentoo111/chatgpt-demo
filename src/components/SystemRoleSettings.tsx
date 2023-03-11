import { Show,createSignal,onMount,onCleanup,For,createEffect } from 'solid-js'
import type { Accessor, Setter } from 'solid-js'
import IconEnv from './icons/Env'
import  PromptItem from './Generator'

interface Props {
  canEdit: Accessor<boolean>
  systemRoleEditing: Accessor<boolean>
  setSystemRoleEditing: Setter<boolean>
  currentSystemRoleSettings: Accessor<string>
  setCurrentSystemRoleSettings: Setter<string>
  setPrompt:Setter<typeof PromptItem[]>
  prompt:Accessor<typeof PromptItem[]>
  hover: boolean
}

export default (props: Props) => {
  const [hoverIndex, setHoverIndex] = createSignal(0)
  const [maxHeight, setMaxHeight] = createSignal("320px")
  const [currentPrompt,setCurrentPrompt]=createSignal<string>("")
  function listener(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      setHoverIndex(hoverIndex() + 1)
    } else if (e.key === "ArrowUp") {
      setHoverIndex(hoverIndex() - 1)
    } else if (e.key === "Enter") {
      systemInputRef.value=props.prompt()[hoverIndex()].prompt
      // props.setCurrentSystemRoleSettings(props.prompt()[hoverIndex()].prompt)
      // props.select(props.prompt()[hoverIndex()].prompt)
      // props.select()
    }
  }
  let systemInputRef: HTMLTextAreaElement
  let containerRef: HTMLUListElement
  const handleButtonClick = () => {
    props.setCurrentSystemRoleSettings(systemInputRef.value)
    props.setSystemRoleEditing(false)
  }
  const itemClick=(k)=>{
    systemInputRef.value=k
  }
  createEffect(() => {
    if (hoverIndex() < 0) {
      setHoverIndex(0)
    } else if (hoverIndex() && hoverIndex() >= props.prompt().length) {
      setHoverIndex(props.prompt().length - 1)
    }
  })

  createEffect(() => {
    if (containerRef && props.prompt().length)
      setMaxHeight(
          `${
              window.innerHeight - containerRef.clientHeight > 112
                  ? 320
                  : window.innerHeight - 112
          }px`
      )
  })
  onMount(() => {
    window.addEventListener("keydown", listener)
  })
  onCleanup(() => {
    window.removeEventListener("keydown", listener)
  })
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
          <ul
              ref={containerRef!}
              class="bg-slate bg-op-15 dark:text-slate text-slate-7 overflow-y-auto rounded-t"
              style={{
                "max-height": maxHeight()
              }}
          >
            <For each={props.prompt()}>
              {(prompt, i) => (
                  <Item
                      prompt={prompt}
                      select={itemClick}
                      hover={hoverIndex() === i()}
                  />
              )}
            </For>
          </ul>

          <button onClick={handleButtonClick} h-12 px-4 py-2 bg-slate bg-op-15 hover:bg-op-20 rounded-sm>
            设置
          </button>
        </div>
      </Show>
    </div>
  )
}

function Item(props: {
  prompt: typeof PromptItem
  hover: boolean
  select:(s)=>string
}) {
  let ref: HTMLLIElement
  createEffect(() => {
    if (props.hover) {
      ref.focus()
      ref.scrollIntoView({ block: "center" })
    }
  })
  return (
      <li
          ref={ref!}
          class="hover:bg-slate hover:bg-op-20 py-1 px-3"
          classList={{
            "bg-slate": props.hover,
            "bg-op-20": props.hover
          }}
          onClick={() => {
            console.log(props.prompt.prompt)
            props.select(props.prompt.prompt)
          }}
      >
        <p>{props.prompt.desc}</p>
        <p class="text-0.4em">{props.prompt.prompt}</p>
      </li>
  )
}