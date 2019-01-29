/* @flow */
/* eslint max-lines: 0 */
import { isPayPalDomain } from '../../../src/lib';
import { PPTM_ID } from '../../../src/constants';
import { createTestContainer, destroyTestContainer, destroyElement } from '../common';

describe(`external pptm`, () => {
    beforeEach(() => {
        createTestContainer();
    });

    afterEach(() => {
        destroyTestContainer();
        destroyElement(PPTM_ID);
    });

    it('should load the pptm script with async prop and correct url', done => {
        window.paypal.Button.render({
            env:    'test',
            client: {
                test: 'foo'
            },
            test: {
                onRender() : void {
                    let el = document.getElementById(PPTM_ID);

                    if (!el) {
                        return done(new Error('Expected pptm script to not be loaded'));
                    }

                    if (!el.async) {
                        return done(new Error('Expected pptm script to be async'));
                    }
    
                    let expectedUrl = `pptm.js?client_id=foo&id=${ window.location.hostname }&t=xo`;
    
                    if (el.src.indexOf(expectedUrl) === -1) {
                        return done(new Error(`Expected pptm script to contain ${ expectedUrl } but found ${ el.src }`));
                    }

                    return done();
                }
            },

            payment() {
                done(new Error('Expected payment() to not be called'));
            },

            onAuthorize() {
                done(new Error('Expected onAuthorize() to not be called'));
            }
        }, '#testContainer');
    });

    it('should not add pptm.js script tag when inside a PayPal domain', done => {
        window.mockDomain = 'mock://www.paypal.com';

        window.paypal.Button.render({

            test: {
                onRender() : void {
                    let el = document.getElementById(PPTM_ID);

                    if (el) {
                        return done(new Error(`Expected pptm script to not be loaded, window.location.hostname = ${ window.location.hostname }, window.mockDomain = ${ window.mockDomain }, isPayPalDomain = ${ isPayPalDomain() }`));
                    }

                    return done();
                }
            },

            payment() {
                done(new Error('Expected payment() to not be called'));
            },

            onAuthorize() {
                done(new Error('Expected onAuthorize() to not be called'));
            }
        }, '#testContainer');
    });
});
