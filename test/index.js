'use strict'

const testConfig = {
    hostname: "sid.demo.sk.ee",
    apiPath: "/smart-id-rp/v1",
    relyingPartyUUID: "00000000-0000-0000-0000-000000000000",
    replyingPartyName: "DEMO",
    issuers: [
        {
          "C": "EE",
          "O": "AS Sertifitseerimiskeskus",
          "OID": "NTREE-10747013",
          "CN": "TEST of EID-SK 2015"
        },
        {
          "C": "EE",
          "O": "AS Sertifitseerimiskeskus",
          "OID": "NTREE-10747013",
          "CN": "EID-SK 2016"
        },
        {
          "C": "EE",
          "O": "SK ID Solutions AS",
          "OID": "NTREE-10747013",
          "CN": "ESTEID2018"
        },
        {
          "CN": "ESTEID-SK 2011",
          "O": "AS Sertifitseerimiskeskus",
          "C": "EE"
        },
        {
          "CN": "EID-SK 2011",
          "O": "AS Sertifitseerimiskeskus",
          "C": "EE"
        },
        {
          "CN": "ESTEID-SK 2015",
          "OID": "NTREE-10747013",
          "O": "AS Sertifitseerimiskeskus",
          "C": "EE"
        },
        {
          "C": "EE",
          "O": "AS Sertifitseerimiskeskus",
          "OID": "NTREE-10747013",
          "CN": "TEST of EID-SK 2015"
        },
        {
          "C": "EE",
          "O": "AS Sertifitseerimiskeskus",
          "OID": "NTREE-10747013",
          "CN": "TEST of EID-SK 2016"
        },
        {
          "C": "EE",
          "O": "AS Sertifitseerimiskeskus",
          "OID": "NTREE-10747013",
          "CN": "TEST of ESTEID-SK 2015"
        },
        {
          "C": "EE",
          "O": "AS Sertifitseerimiskeskus",
          "OID": "NTREE-10747013",
          "CN": "TEST of ESTEID-SK 2016"
        },
        {
          "C":"EE",
          "O":"AS Sertifitseerimiskeskus",
          "CN":"TEST of EID-SK 2011",
          "E":"pki@sk.ee"
        }
      ]
};

const assert = require('chai').assert;
const crypto = require('crypto');
const smartId = require('../index.js')();
smartId.init(testConfig);

suite('Certificate', function () {
    test('Success', async function () {
        const countryCode = 'EE';
        const nationalIdentityNumber = '30303039914';

        const result = await smartId.getUserCertificate(nationalIdentityNumber, countryCode);
        assert.match(result, /[0-9A-B]/);
    });
})
suite('Auth', function () {
    test('Success - Estonian national identity number', async function () {
        this.timeout(15000); //eslint-disable-line no-invalid-this

        const nationalIdentityNumber = '30303039914';
        const countryCode = 'EE'

        const result = await smartId.authenticate(nationalIdentityNumber, countryCode);
        assert.match(result.challengeID, /[0-9]{4}/);
        const authResult = await smartId.statusAuth(result.sessionId, result.sessionHash);
        const personalInfo = {
            firstName: 'QUALIFIED OK1',
            lastName: 'TESTNUMBER',
            pid: 'PNOEE-30303039914',
            country: 'EE'
        };

        assert.equal(authResult.state, 'COMPLETE');
        assert.equal(authResult.result.endResult, 'OK');
        assert.equal(authResult.result.documentNumber, 'PNOEE-30303039914-D961-Q');
        assert.deepEqual(authResult.personalInfo, personalInfo);
        assert.deepEqual(Object.keys(authResult.signature), ['value', 'algorithm']);
        assert.deepEqual(Object.keys(authResult.cert), ['value', 'certificateLevel']);
    });

    test('Fail - Invalid country code', async function () {
        const countryCode = '00';
        const nationalIdentityNumber = '30303039914';

        try {
            await smartId.authenticate(nationalIdentityNumber, countryCode);
        } catch (e) {
            assert.equal(e.message, 'Bad Request');
        }
    });

    test('Fail - Invalid national identity number', async function () {
        const countryCode = 'EE';
        const nationalIdentityNumber = '510';

        try {
            await smartId.authenticate(nationalIdentityNumber, countryCode)
        } catch(e) {
            assert.equal(e.message, 'Not Found');
        };

    });

    test('Fail - user refused the session', async function () {
        const countryCode = 'LV';
        const nationalIdentityNumber = '030403-10016';

        const result = await smartId.authenticate(nationalIdentityNumber, countryCode);
        assert.match(result.challengeID, /[0-9]{4}/);
        const authResult = await smartId.statusAuth(result.sessionId, result.sessionHash);
        assert.equal(authResult.state, 'COMPLETE');
        assert.equal(authResult.result.endResult, 'USER_REFUSED');
    });

    test('Fail - there was a timeout, i.e. end user did not confirm or refuse the operation within given timeframe.', async function () {
        const countryCode = 'EE';
        const nationalIdentityNumber = '30403039983';

        const result = await smartId.authenticate(nationalIdentityNumber, countryCode);
        assert.match(result.challengeID, /[0-9]{4}/);

        const maxRetries = 20;
        let retries = 0;

        const authResult = await new Promise (function (resolve, reject) {
            const poller = setInterval(async function () {
                try {
                    if (retries < maxRetries) {
                        retries++;
                        const authResult = await smartId.statusAuth(result.sessionId, result.sessionHash);
                        if (authResult.state === 'COMPLETE') {
                            clearInterval(poller);
                            return resolve(authResult);
                        }
                    } else {
                        clearInterval(poller);
                        return reject(new Error(`loginSmartIdStatus maximum retry limit ${maxRetries} reached!`));
                    }
                } catch (e){
                    clearInterval(poller);
                    return reject(e);
                }


            }, 5000);
        });

        assert.equal(authResult.state, 'COMPLETE');
        assert.equal(authResult.result.endResult, 'TIMEOUT');
    });
});

suite('Sign', function () {
    test('Success - Estonian national identity number', async function () {
        this.timeout(10000); //eslint-disable-line no-invalid-this

        const countryCode = 'EE';
        const nationalIdentityNumber = '30303039914';
        const hash = crypto.createHash('SHA256');
        hash.update('Sign this text');
        const finalHash = hash.digest('hex');

        const result = await smartId.signature(nationalIdentityNumber, countryCode, Buffer.from(finalHash, 'hex').toString('base64'));
        assert.match(result.challengeID, /[0-9]{4}/);

        const maxRetries = 20;
        let retries = 0;
        const signResult = await new Promise (function (resolve, reject) {
            const poller = setInterval(async function () {
                try {
                    if (retries < maxRetries) {
                        retries++;
                        const signResult = await  smartId.statusSign(result.sessionId);
                        if (signResult.state === 'COMPLETE') {
                            clearInterval(poller);
                            return resolve(signResult);
                        }
                    } else {
                        clearInterval(poller);
                        return reject(new Error(`loginSmartIdStatus maximum retry limit ${maxRetries} reached!`));
                    }
                } catch (e){
                    clearInterval(poller);
                    return reject(e);
                }


            }, 5000);
        });

        assert.equal(signResult.state, 'COMPLETE');
        assert.equal(signResult.result.endResult, 'OK');
        assert.property(signResult, 'signature');
    });

    test('Fail - Invalid hash', async function () {
        this.timeout(5000); //eslint-disable-line no-invalid-this

        const countryCode = 'EE';
        const nationalIdentityNumber = '30303039914';
        try {
            await smartId.signature(nationalIdentityNumber, countryCode, '');
        } catch(e) {
            assert.equal(e.message, 'Bad Request');
        };
    });

    test('Fail - there was a timeout, i.e. end user did not confirm or refuse the operation within given timeframe.', async function () {
        const countryCode = 'EE';
        const nationalIdentityNumber = '30403039983';

        const hash = crypto.createHash('SHA256');
        hash.update('Sign this text');
        const finalHash = hash.digest('hex');

        const result = await smartId.signature(nationalIdentityNumber, countryCode, Buffer.from(finalHash, 'hex').toString('base64'));
        const maxRetries = 20;
        let retries = 0;
        const signResult = await new Promise (function (resolve, reject) {
            const poller = setInterval(async function () {
                try {
                    if (retries < maxRetries) {
                        retries++;
                        const signResult = await  smartId.statusSign(result.sessionId, 10000);
                        if (signResult.state === 'COMPLETE') {
                            clearInterval(poller);
                            return resolve(signResult);
                        }
                    } else {
                        clearInterval(poller);
                        return reject(new Error(`loginSmartIdStatus maximum retry limit ${maxRetries} reached!`));
                    }
                } catch (e){
                    clearInterval(poller);
                    return reject(e);
                }


            }, 10000);
        });

        assert.equal(signResult.state, 'COMPLETE');
        assert.equal(signResult.result.endResult, 'TIMEOUT');
    });
});