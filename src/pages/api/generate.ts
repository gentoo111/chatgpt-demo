import type { APIRoute } from 'astro'
import { generatePayload, parseOpenAIStream } from '@/utils/openAI'
import { verifySignature } from '@/utils/auth'
// #vercel-disable-blocks
import { fetch, ProxyAgent } from 'undici'
// #vercel-end


const https_proxy = import.meta.env.HTTPS_PROXY
const superKey=import.meta.env.SUPER_KEY


export const post: APIRoute = async (context) => {


  const body = await context.request.json()
  const { sign, time, messages,key } = body
  let apiKey = import.meta.env.OPENAI_API_KEY
  if(key!=superKey){
    apiKey=key
  }
  if (!messages) {
    return new Response('No input text')
  }
  if (import.meta.env.PROD && !await verifySignature({ t: time, m: messages?.[messages.length - 1]?.content || '', }, sign)) {
    return new Response('Invalid signature')
  }
  const initOptions = generatePayload(apiKey, messages)
  // #vercel-disable-blocks
  if (https_proxy) {
    initOptions['dispatcher'] = new ProxyAgent(https_proxy)
  }
  // #vercel-end

  // @ts-ignore
  const response = await fetch('https://api.openai.com/v1/chat/completions', initOptions) as Response

  return new Response(parseOpenAIStream(response))
}
