/* @flow */

import { track, info } from 'beaver-logger/client';

import { config } from '../config';
import { FPTI, PPTM_ID } from '../constants';
import { stringifyError, extendUrl, loadScript, getElement, isPayPalDomain } from '../lib';


function shouldCreateInitialPptmScript() : boolean {
    const id = window.location.hostname;

    if (!id) {
        return false;
    }

    if (isPayPalDomain()) {
        return false;
    }

    const existingScript = getElement(PPTM_ID);
    const alreadyDownloaded = Boolean(existingScript);

    if (alreadyDownloaded) {
        info('pptm_tried_loading_twice');
        return false;
    }

    return true;
}

function removePptm() {
    const script = getElement(PPTM_ID);

    if (script) {
        // $FlowFixMe
        script.parentNode.removeChild(script);
    }
}

export function pptmFactory() : Object {
    let noContentFoundInContainer = false;

    // This is the callback parameter that will be sent in the request to pptm.js. If pptm.js can't find
    // a container, it will send back a body of window.__pptmLoadedWithNoContent() with content-type JavaScript
    // in order to execute the callback on the client. The callback will set `noContentFoundInContainer` to true,
    // so during button render it can look to see if it should try a call to pptm.js again with the Client ID.
    // Note that on pages where checkout.js is included, but there is no button rendered, this callback
    // will be a no-op.
    let callback = `__pptmLoadedWithNoContent`;
    let listener;

    let obj = {
        // the onRender method may be called before pptm.js loads, so therefore
        // we can set up a listener for whenever window.__pptmLoadedWithNoContent is called.
        onLoadWithNoContent(_listener) {
            listener = _listener;
        },
        listenForLoadWithNoContent() {
            window[callback] = () => {
                noContentFoundInContainer = true;

                if (listener) {
                    listener();
                    listener = undefined;
                }
            };
        },
        get callback() : string {
            return callback;
        },
        get noContentFoundInContainer() : boolean {
            return noContentFoundInContainer;
        },
        createPptmScript: (clientId : ?string) => {
            track({
                [ FPTI.KEY.STATE ]:      FPTI.STATE.PPTM,
                [ FPTI.KEY.TRANSITION ]: FPTI.TRANSITION.PPTM_LOAD
            });
        
            let params = {
                t:         'xo',
                id:        window.location.hostname,
                mrid:      config.merchantID,
                client_id: '',
                callback
            };
        
            if (clientId) {
                params.client_id = clientId;
            } else {
                delete params.client_id;
            }
        
            const fullUrl = extendUrl(config.pptmUrl, params);
        
            loadScript(fullUrl, 0, { async: true, id: PPTM_ID }).then(() => {
                track({
                    [ FPTI.KEY.STATE ]:      FPTI.STATE.PPTM,
                    [ FPTI.KEY.TRANSITION ]: FPTI.TRANSITION.PPTM_LOADED
                });
            }).catch(err => {
                info('pptm_script_error', { error: stringifyError(err) });
            });
        },
        shouldCreateInitialPptmScript,
        shouldReloadPptmScript(clientId : string) : boolean {
            if (noContentFoundInContainer === false) {
                return false;
            }

            if (isPayPalDomain()) {
                return false;
            }
        
            // If a merchant ID was already provided, then that meant we initially
            // loaded the pptm script with that value as the main container
            // look-up value, so in this case we don't want to reload pptm.
            if (config.merchantID) {
                return false;
            }
        
            if (clientId) {
                return true;
            }
        
            return false;
        },
        removePptm
    };

    return obj;
}
