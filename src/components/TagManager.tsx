import Script from 'next/script'
import { GTM_ID_RULE } from '@/contracts'

/**
 * Google Tag Manager, with its container id read from the console.
 *
 * The id is validated before it reaches a script URL. It arrives from a
 * database row an editor typed into, and pasting a whole snippet — or anything
 * with a quote in it — into `src` would put attacker-chosen text inside the
 * document. `GTM-XXXXXXX` is the only shape Google issues, so anything else is
 * simply not loaded.
 *
 * `afterInteractive` rather than `beforeInteractive`: the container is
 * measurement, and measurement never delays the first paint of a page whose
 * visitors are on rural mobile connections.
 */
export function TagManager({
  id, consentMode = false, dataLayer = [],
}: {
  id: string
  consentMode?: boolean
  dataLayer?: { key: string; value: string }[]
}) {
  if (!GTM_ID_RULE.test(id)) return null

  // Everything below is written as JSON, so a value typed in the console is
  // data in the script rather than code in it.
  const vars = Object.fromEntries(
    (Array.isArray(dataLayer) ? dataLayer : [])
      .filter((v) => v && String(v.key ?? '').trim())
      .map((v) => [String(v.key).trim(), String(v.value ?? '')]),
  )

  const consent = consentMode
    ? `gtag('consent','default',${JSON.stringify({
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        wait_for_update: 500,
      })});`
    : ''

  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
${consent}
${Object.keys(vars).length ? `dataLayer.push(${JSON.stringify(vars)});` : ''}
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(id)});`}
    </Script>
  )
}

/**
 * The iframe fallback, first thing inside <body>, for visitors without
 * JavaScript. It measures nothing on its own; it is what Google's own snippet
 * asks for, and leaving it out is the usual reason a container reports fewer
 * sessions than the server logs.
 */
export function TagManagerNoScript({ id }: { id: string }) {
  if (!GTM_ID_RULE.test(id)) return null
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`}
        height="0"
        width="0"
        title="Google Tag Manager"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  )
}
