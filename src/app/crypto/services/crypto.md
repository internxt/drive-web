# Testing hash functions
We test all hash functions against test vectors from RFC, NIST, or provided by thier authors. This makes it easy to verify the third-party implementation with fairly robust coverage.

| Hash | Standard | Test Vectors |
| ------ | ------ |--------------|
| sha256 | Defined in [NIST FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf)| [NIST test vectors for sha256](https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/SHA256.pdf) parsed by [DI Management Services](https://www.di-mgt.com.au/sha_testvectors.html)  |
| sha512 | Defined in [NIST FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf)|[NIST test vectors for sha512](https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/SHA512.pdf) parsed by [DI Management Services](https://www.di-mgt.com.au/sha_testvectors.html)|
| ripemd160 |Not standartized |[Test vectors provided by authors](https://homes.esat.kuleuven.be/~bosselae/ripemd160.html)|
| blake3 | Not standartized, [ specs](https://github.com/BLAKE3-team/BLAKE3-specs/blob/master/blake3.pdf) are public. Blake was the final round contestant in [NIST hash function competition](https://csrc.nist.gov/csrc/media/projects/hash-functions/documents/sha-3_selection_announcement.pdf).  |[Test vectors provided by authors](https://github.com/BLAKE3-team/BLAKE3/blob/master/test_vectors/test_vectors.json)|

# Testing hmac

We test hmac-sha512 with test vectors from [RFC4231](https://datatracker.ietf.org/doc/html/rfc4231).