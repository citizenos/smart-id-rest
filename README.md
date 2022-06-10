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
const result = await smartId.authenticate(nationalIdentityNumber, countryCode);
const authResult = await smartId.statusAuth(result.sessionId, result.sessionHash);
/*
    authResult contains response from API, see https://github.com/SK-EID/smart-id-documentation#464-response-structure
*/
const personalInfo = await smartId.getCertUserData(authResult.cert.value);
/* personalInfo with structure:
    {
        firstName: subject.GivenName,
        lastName: subject.SurName,
        pid,
        country: subject.Country
    }
*/
```

### Sign

This is basic example for signing, if the desired result is to sign a bdoc or asice container, see [undersign](https://github.com/moll/js-undersign). Example usages [citizenos](https://github.com/citizenos/citizenos-api) or [rahvaalgatus](https://github.com/rahvaalgatus/rahvaalgatus)

```javascript
const hash = crypto.createHash('SHA256');
hash.update('Sign this text');
const finalHash = hash.digest('hex');

const result = await smartId.signature(nationalIdentityNumber, countryCode, Buffer.from(finalHash, 'hex').toString('base64'));
const signResult = await smartId.statusSign(result.sessionId);
/*
    signResult contains response from API, see https://github.com/SK-EID/smart-id-documentation#464-response-structure
*/
```

## Credits

* [CitizenOS](https://citizenos.com) for funding the development
