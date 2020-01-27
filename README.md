# Simple Smart-ID rest client for node

## Install
```
npm install smart-id-rest
```

## Run tests
```
npm test
```

## Usage

### Configure client
```javascript
const smartIdClient = require('smart-id-rest')();

smartIdClient.init({
    hostname: "{hostname}",
    apiPath: "{apiPath}",
    relyingPartyUUID: "{relyingPartyUUID}",
    replyingPartyName: "{replyingPartyName}",
    issuers: [{
          "C": "EE",
          "O": "AS Sertifitseerimiskeskus",
          "OID": "NTREE-10747013",
          "CN": "TEST of EID-SK 2015"
        }...]
});
```

### Authenticate
```javascript
smartId
    .authenticate(nationalIdentityNumber, countryCode)
    .then(function (result) {
        smartId
            .statusAuth(result.sessionId, result.sessionHash)
            .then(function (authResult) {
                /*
                authResult contains response from API, see https://github.com/SK-EID/smart-id-documentation#464-response-structure
                */
                smartId
                    .getCertUserData(authResult.cert.value)
                    .then(function (personalInfo) {
                        /* With structure {
                            firstName: subject.GivenName,
                            lastName: subject.SurName,
                            pid,
                            country: subject.Country
                        }*/
                    });
            });
    });
```

### Sign

This is basic example for signing, if the desired result is to sign a bdoc or asice container, see [undersign](https://github.com/moll/js-undersign). Example usages [citizenos](https://github.com/citizenos/citizenos-api) or [rahvaalgatus](https://github.com/rahvaalgatus/rahvaalgatus)

```javascript
const hash = crypto.createHash('SHA256');
hash.update('Sign this text');
const finalHash = hash.digest('hex');

smartId
        .signature(nationalIdentityNumber, countryCode, Buffer.from(finalHash, 'hex').toString('base64'))
        .then(function (result) {
            smartId.statusSign(result.sessionId)
                .then(function(signResult) {
                    /*
                    signResult contains response from API, see https://github.com/SK-EID/smart-id-documentation#464-response-structure
                    */
                });
        })
```

## Credits

* [CitizenOS](https://citizenos.com) for funding the development
