import type {ChatMessage} from '@/types'
import {createSignal, Index, Show, onMount} from 'solid-js'
import IconClear from './icons/Clear'
import IconRobotDead from './icons/RobotDead'
import IconSend from './icons/Send'
import MessageItem from './MessageItem'
import SystemRoleSettings from './SystemRoleSettings'
import _ from 'lodash'
import {generateSignature} from '@/utils/auth'
import KeySetting from "./KeySetting";

export default () => {
    onMount(() => {
        setCurrentKey(localStorage.getItem("key") ?? "")
    })
    let inputRef: HTMLTextAreaElement, keyRef: HTMLInputElement
    const [currentSystemRoleSettings, setCurrentSystemRoleSettings] = createSignal('')
    const [currentKey, setCurrentKey] = createSignal('')
    const [systemRoleEditing, setSystemRoleEditing] = createSignal(false)
    const [showKey, setKey] = createSignal(false)
    const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
    const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
    const [loading, setLoading] = createSignal(false)
    const [controller, setController] = createSignal<AbortController>(null)

    let forcedAssistant: HTMLTextAreaElement
    const [forcedAssistantEnabled, setForcedAssistantEnabled] = createSignal(false)

    const handleButtonClick = async () => {
        localStorage.setItem("key", currentKey())

        const inputValue = inputRef.value

        if (!inputValue) {
            return
        }
        // if (!currentKey()) {
        //   setCurrentAssistantMessage('api额度用完,请输入有效openAi_Key使用')
        //   return
        // }


        if (forcedAssistantEnabled()) {
            forceAssistant(inputValue)
            return
        }

        // @ts-ignore
        if (window?.umami) umami.trackEvent('chat_generate')
        inputRef.value = ''
        setMessageList([
            ...messageList(),
            {
                role: 'user',
                content: inputValue,
            },
        ])
        requestWithLatestMessage()
    }

    const forceAssistant = (message: string) => {
        const forcedValue = forcedAssistant.value
        if (!forcedValue) {
            return
        }

        forcedAssistant.value = ''
        inputRef.value = ''

        setMessageList([
            ...messageList(),
            {
                role: 'user',
                content: message,
            },
            {
                role: 'assistant',
                content: forcedValue,
            }
        ])

        inputRef.focus()
    }

    const throttle = _.throttle(function () {
        window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})
    }, 300, {
        leading: true,
        trailing: false
    })

    const requestWithLatestMessage = async () => {
        setLoading(true)
        setCurrentAssistantMessage('')
        try {
            const controller = new AbortController()
            setController(controller)
            const requestMessageList = [...messageList()]
            if (currentSystemRoleSettings()) {
                requestMessageList.unshift({
                    role: 'system',
                    content: currentSystemRoleSettings(),
                })
            }
            const timestamp = Date.now()
            const response = await fetch('/api/generate', {
                method: 'POST',
                body: JSON.stringify({
                    key: currentKey(),
                    messages: requestMessageList,
                    time: timestamp,
                    sign: await generateSignature({
                        t: timestamp,
                        m: requestMessageList?.[requestMessageList.length - 1]?.content || '',
                    }),
                }),
                signal: controller.signal,
            })
            if (!response.ok) {
                throw new Error(response.statusText)
            }
            const data = response.body
            if (!data) {
                throw new Error('No data')
            }
            const reader = data.getReader()
            const decoder = new TextDecoder('utf-8')
            let done = false

            while (!done) {
                const {value, done: readerDone} = await reader.read()
                if (value) {
                    let char = decoder.decode(value)
                    if (char === '\n' && currentAssistantMessage().endsWith('\n')) {
                        continue
                    }
                    if (char) {
                        setCurrentAssistantMessage(currentAssistantMessage() + char)
                    }
                    throttle()
                }
                done = readerDone
            }
        } catch (e) {
            console.error(e)
            setLoading(false)
            setController(null)
            return
        }
        archiveCurrentMessage()
    }

    const archiveCurrentMessage = () => {
        if (currentAssistantMessage()) {
            setMessageList([
                ...messageList(),
                {
                    role: 'assistant',
                    content: currentAssistantMessage(),
                },
            ])
            setCurrentAssistantMessage('')
            setLoading(false)
            setController(null)
            inputRef.focus()
        }
    }

    const clear = () => {
        inputRef.value = ''
        inputRef.style.height = 'auto';
        setMessageList([])
        setCurrentAssistantMessage('')
        setCurrentSystemRoleSettings('')
    }

    const stopStreamFetch = () => {
        if (controller()) {
            controller().abort()
            archiveCurrentMessage()
        }
    }

    const retryLastFetch = () => {
        if (messageList().length > 0) {
            const lastMessage = messageList()[messageList().length - 1]
            console.log(lastMessage)
            if (lastMessage.role === 'assistant') {
                setMessageList(messageList().slice(0, -1))
                requestWithLatestMessage()
            }
        }
    }

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.isComposing || e.shiftKey) {
            return
        }
        if (e.key === 'Enter') {
            handleButtonClick()
        }
    }

    // @ts-ignore
    return (
        <div my-6>
            <SystemRoleSettings
                canEdit={() => messageList().length === 0}
                systemRoleEditing={systemRoleEditing}
                setSystemRoleEditing={setSystemRoleEditing}
                currentSystemRoleSettings={currentSystemRoleSettings}
                setCurrentSystemRoleSettings={setCurrentSystemRoleSettings}
            />
            <KeySetting
                setKey={setKey}
                showKey={showKey}
                currentKey={currentKey}
                setCurrentKey={setCurrentKey}
            />
            <Index each={messageList()}>
                {(message, index) => (
                    <MessageItem
                        role={message().role}
                        message={message().content}
                        showRetry={() => (message().role === 'assistant' && index === messageList().length - 1)}
                        onRetry={retryLastFetch}
                    />
                )}
            </Index>
            {currentAssistantMessage() && (
                <MessageItem
                    role="assistant"
                    message={currentAssistantMessage}
                />
            )}
            <Show
                when={!loading()}
                fallback={() => (
                    <div
                        class="h-12 my-4 flex gap-4 items-center justify-center bg-slate bg-op-15 text-slate rounded-sm">
                        <span>ChatGPT正在思考...</span>
                        <div
                            class="px-2 py-0.5 border border-slate text-slate rounded-md text-sm op-70 cursor-pointer hover:bg-slate/10"
                            onClick={stopStreamFetch}>停止
                        </div>
                    </div>
                )}
            >
                <div class="my-4 flex items-center gap-2 transition-opacity" class:op-50={systemRoleEditing()}>
          <textarea
              ref={inputRef!}
              disabled={systemRoleEditing()}
              onKeyDown={handleKeydown}
              placeholder="SHIFT+ENTER换行"
              autocomplete="off"
              autofocus
              onInput={() => {
                  inputRef.style.height = 'auto';
                  inputRef.style.height = inputRef.scrollHeight + 'px';
              }}
              rows="1"
              w-full
              px-3 py-3
              min-h-12
              max-h-36
              rounded-sm
              bg-slate
              bg-op-15
              resize-none
              focus:bg-op-20
              focus:ring-0
              focus:outline-none
              placeholder:op-50
              //@ts-ignore
              dark="placeholder:op-30"
              scroll-pa-8px
          />
                    <button title="发送" onClick={handleButtonClick} disabled={systemRoleEditing()} h-12 px-4 py-2
                            bg-slate bg-op-15 hover:bg-op-20 text-slate rounded-sm>
                        <IconSend/>
                    </button>
                    <button title="清除" onClick={clear} disabled={systemRoleEditing()} h-12 px-4 py-2 bg-slate bg-op-15
                            hover:bg-op-20 text-slate rounded-sm>
                        <IconClear/>
                    </button>
                    <button title="Forced Assistant" onClick={() => setForcedAssistantEnabled((prev) => !prev)}
                            disabled={systemRoleEditing()} hidden sm:block h-12 px-4 py-2 bg-slate bg-op-15 hover:bg-op-20 rounded-sm>
                        <IconRobotDead/>
                    </button>
                </div>
                <Show when={forcedAssistantEnabled()}>
          <textarea
              ref={forcedAssistant!}
              disabled={systemRoleEditing()}
              onKeyDown={handleKeydown}
              placeholder="Enter forced assistant text..."
              autocomplete="off"
              autofocus
              onInput={() => {
                  forcedAssistant.style.height = 'auto';
                  forcedAssistant.style.height = forcedAssistant.scrollHeight + 'px';
              }}
              rows="1"
              w-full
              px-3 py-3
              min-h-12
              max-h-36
              rounded-sm
              bg-slate
              bg-op-15
              resize-none
              focus:bg-op-20
              focus:ring-0
              focus:outline-none
              placeholder:op-50
              //@ts-ignore
              dark="placeholder:op-30"
              scroll-pa-8px
          />
                </Show>
            </Show>
        </div>
    )
}
