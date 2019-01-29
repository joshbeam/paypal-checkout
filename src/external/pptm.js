/* @flow */

import { track, info } from 'beaver-logger/client';

import { config } from '../config';
import { FPTI, PPTM_ID } from '../constants';
import { stringifyError, extendUrl, loadScript, getElement, isPayPalDomain } from '../lib';

export function createPptmScript(clientId : string) {
    track({
        [ FPTI.KEY.STATE ]:      FPTI.STATE.PPTM,
        [ FPTI.KEY.TRANSITION ]: FPTI.TRANSITION.PPTM_LOAD
    });

    const fullUrl = extendUrl(config.pptmUrl, {
        t:         'xo',
        id:        window.location.hostname,
        mrid:      config.merchantID,
        client_id: clientId
    });

    loadScript(fullUrl, 0, { async: true, id: PPTM_ID }).then(() => {
        track({
            [ FPTI.KEY.STATE ]:      FPTI.STATE.PPTM,
            [ FPTI.KEY.TRANSITION ]: FPTI.TRANSITION.PPTM_LOADED
        });
    }).catch(err => {
        info('pptm_script_error', { error: stringifyError(err) });
    });
}

export function shouldCreateInitialPptmScript() : boolean {
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

export function shouldReloadPptmScript(clientId : string) : boolean {
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
}

export function removePptm() {
    const script = getElement(PPTM_ID);

    script.parentNode.removeChild(script);
}
