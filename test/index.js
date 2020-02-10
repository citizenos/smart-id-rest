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

suite('Auth', function () {
    test('Success - Estonian national identity number', function (done) {
        this.timeout(5000); //eslint-disable-line no-invalid-this

        const nationalIdentityNumber = '10101010005';
        const countryCode = 'EE'

        smartId
            .authenticate(nationalIdentityNumber, countryCode)
            .then(function (result) {
                assert.match(result.challengeID, /[0-9]{4}/);

                smartId
                    .statusAuth(result.sessionId, result.sessionHash)
                    .then(function (authResult) {
                        const personalInfo = {
                            firstName: 'DEMO',
                            lastName: 'SMART-ID',
                            pid: 'PNOEE-10101010005',
                            country: 'EE'
                        };

                        assert.equal(authResult.state, 'COMPLETE');
                        assert.equal(authResult.result.endResult, 'OK');
                        assert.equal(authResult.result.documentNumber, 'PNOEE-10101010005-Z1B2-Q');
                        assert.deepEqual(authResult.personalInfo, personalInfo);
                        assert.deepEqual(Object.keys(authResult.signature), ['value', 'algorithm']);
                        assert.deepEqual(Object.keys(authResult.cert), ['value', 'certificateLevel']);

                        return done();
                    }).catch(function(e) {
                        console.log(e);
                    });
            });
    });

    test('Fail - Invalid country code', function (done) {
        const countryCode = '00';
        const nationalIdentityNumber = '10101010005';

        smartId
            .authenticate(nationalIdentityNumber, countryCode)
            .catch(function (e) {
                assert.equal(e.message, 'Bad Request');
                done();
            });

    });

    test('Fail - Invalid national identity number', function (done) {
        const countryCode = 'EE';
        const nationalIdentityNumber = '510';

        smartId
            .authenticate(nationalIdentityNumber, countryCode)
            .catch(function (e) {
                assert.equal(e.message, 'Not Found');
                done();
            });

    });

    test('Fail - user refused the session', function (done) {
        const countryCode = 'EE';
        const nationalIdentityNumber = '10101010016';

        smartId
            .authenticate(nationalIdentityNumber, countryCode)
            .then(function (result) {
                assert.match(result.challengeID, /[0-9]{4}/);

                smartId
                    .statusAuth(result.sessionId, result.sessionHash)
                    .then(function (authResult) {

                        assert.equal(authResult.state, 'COMPLETE');
                        assert.equal(authResult.result.endResult, 'USER_REFUSED');

                        return done();
                    }).catch(done);

            });
    });

    test('Fail - there was a timeout, i.e. end user did not confirm or refuse the operation within given timeframe.', function (done) {
        const countryCode = 'EE';
        const nationalIdentityNumber = '10101010027';

        smartId
            .authenticate(nationalIdentityNumber, countryCode)
            .then(function (result) {
                assert.match(result.challengeID, /[0-9]{4}/);

                let called = 0;
                let replyed = 0;
                const poller = setInterval(function () {
                    if (called === replyed) {
                        called++;
                        smartId.statusAuth(result.sessionId, result.sessionHash)
                        .then(function (authResult) {
                            replyed++;
                            if (authResult.state === 'COMPLETE') {
                                assert.equal(authResult.state, 'COMPLETE');
                                assert.equal(authResult.result.endResult, 'TIMEOUT');
                                clearInterval(poller);

                                done();
                            } else {
                                assert.equal(authResult.state, 'RUNNING');
                            }

                        }).catch(done);
                    }

                }, 5000);
            });
    });
});

suite('Sign', function () {
    test('Success - Estonian national identity number', function (done) {
        this.timeout(5000); //eslint-disable-line no-invalid-this

        const countryCode = 'EE';
        const nationalIdentityNumber = '10101010005';
        const hash = crypto.createHash('SHA256');
        hash.update('Sign this text');
        const finalHash = hash.digest('hex');

        smartId
                .signature(nationalIdentityNumber, countryCode, Buffer.from(finalHash, 'hex').toString('base64'))
                .then(function (result) {
                    assert.match(result.challengeID, /[0-9]{4}/);
                    smartId.statusSign(result.sessionId)
                        .then(function(signResult) {
                            assert.equal(signResult.state, 'COMPLETE');
                            assert.equal(signResult.result.endResult, 'OK');
                            assert.property(signResult, 'signature');
                            done();
                        });
                })
                .catch(done);
    });

    test('Fail - Invalid hash', function (done) {
        this.timeout(5000); //eslint-disable-line no-invalid-this

        const countryCode = 'EE';
        const nationalIdentityNumber = '10101010005';

        smartId
            .signature(nationalIdentityNumber, countryCode, '')
            .catch(function (e) {
                assert.equal(e.message, 'Bad Request');
                done();
            });
    });

    test('Fail - there was a timeout, i.e. end user did not confirm or refuse the operation within given timeframe.', function (done) {
        const countryCode = 'EE';
        const nationalIdentityNumber = '10101010027';

        const hash = crypto.createHash('SHA256');
        hash.update('Sign this text');
        const finalHash = hash.digest('hex');

        smartId
            .signature(nationalIdentityNumber, countryCode, Buffer.from(finalHash, 'hex').toString('base64'))
            .then(function (result) {
                assert.match(result.challengeID, /[0-9]{4}/);

                let called = 0;
                let replyed = 0;
                const poller = setInterval(function () {
                    if (called === replyed) {
                        called++;
                        smartId.statusSign(result.sessionId, 10000)
                            .then(function (authResult) {
                                replyed++;
                                if (authResult.state === 'COMPLETE') {
                                    assert.equal(authResult.state, 'COMPLETE');
                                    assert.equal(authResult.result.endResult, 'TIMEOUT');
                                    clearInterval(poller);

                                    done();
                                } else {
                                    assert.equal(authResult.state, 'RUNNING');
                                }

                            }).catch(done);
                    }

                }, 5000);
            });
    });
});