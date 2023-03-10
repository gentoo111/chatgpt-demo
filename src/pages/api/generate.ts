import type { APIRoute } from 'astro'
import { generatePayload, parseOpenAIStream } from '@/utils/openAI'
import { verifySignature } from '@/utils/auth'
// #vercel-disable-blocks
import { fetch, ProxyAgent } from 'undici'
// #vercel-end



const superKey=import.meta.env.SUPER_KEY
const httpsProxy = import.meta.env.HTTPS_PROXY
const baseUrl = (import.meta.env.OPENAI_API_BASE_URL || 'https://api.openai.com').trim().replace(/\/$/,'')
const sitePassword = import.meta.env.SITE_PASSWORD
let count = 0;
let timestamp = 0;
export const post: APIRoute = async (context) => {
  const now = Date.now();
  if (now - timestamp < 10000) {
    count++;
  } else {
    count = 1;
    timestamp = now;
  }
  console.log(`Method has been called ${count} times in the last minute.`);
  
  const body = await context.request.json()
  const { sign, time, messages, pass, key } = body
  let apiKey = import.meta.env.OPENAI_API_KEY
  if(key!=superKey&&key){
    apiKey=key
  }
  if(count>=3){
    return new Response("You have sent too many messages in a short period of time. Please reduce the frequency of sending messages.")
  }
  if (!messages) {
    return new Response('No input text')
  }
  if (sitePassword && sitePassword !== pass) {
    return new Response('Invalid password')
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
