import type { APIRoute } from 'astro'
import { generatePayload, parseOpenAIStream } from '@/utils/openAI'
import { verifySignature } from '@/utils/auth'
// #vercel-disable-blocks
import { fetch, ProxyAgent } from 'undici'
// #vercel-end



const superKey=import.meta.env.SUPER_KEY
const httpsProxy = import.meta.env.HTTPS_PROXY
const baseUrl = (import.meta.env.OPENAI_API_BASE_URL || 'https://api.openai.com').trim().replace(/\/$/,'')

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
  if (httpsProxy) {
    initOptions['dispatcher'] = new ProxyAgent(httpsProxy)
  }
  // #vercel-end

  // @ts-ignore
  const response = await fetch(`${baseUrl}/v1/chat/completions`, initOptions) as Response
  if(response.statusText!='OK'){
    return response.json().catch(err => {
    }).then(parsedValue => {
      return  new Response(parsedValue.error.message);
    });
  }
  return new Response(parseOpenAIStream(response))
}
