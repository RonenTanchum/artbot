require('dotenv').config()
const ethers = require('ethers')
const fetch = require('node-fetch')

let provider = new ethers.providers.EtherscanProvider(
  'homestead',
  process.env.ETHERSCAN_API_KEY
)

// Runtime ENS cache just to limit queries
let ensAddressMap = {}
let ensResolvedMap = {}
let osAddressMap = {}

async function getENSName(address) {
  let name = ''
  if (ensAddressMap[address]) {
    name = ensAddressMap[address]
  } else {
    let ens = await provider.lookupAddress(address)
    name = ens ?? ''
    ensAddressMap[address] = name
    ensResolvedMap[name] = address
  }
  return name
}

async function resolveEnsName(ensName) {
  let wallet = ''
  if (ensResolvedMap[ensName]) {
    wallet = ensResolvedMap[ensName]
  } else {
    wallet = await provider.resolveName(ensName)
    ensResolvedMap[ensName] = wallet
  }
  return wallet
}

async function ensOrAddress(address) {
  let ens = await getENSName(address)
  return ens !== '' ? ens : address
}

async function getOSName(address) {
  let name = ''
  if (osAddressMap[address]) {
    console.log('Cached!')
    name = osAddressMap[address]
  } else {
    try {
      let response = await fetch(`https://api.opensea.io/user/${address}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-API-KEY': process.env.OPENSEA_API_KEY,
        },
      })
      let responseBody = await response.json()
      if (responseBody.detail) {
        throw new Error(responseBody.detail)
      }
      name = responseBody.username ?? ''
      osAddressMap[address] = name
    } catch (err) {
      // Probably rate limited - return empty sting but don't cache
      name = ''
      console.log(err)
    }
  }

  return name
}

function isWallet(msg) {
  return msg.startsWith('0x') || msg.endsWith('eth')
}

function isVerticalName(msg) {
  return msg === 'curated' || msg === 'factory' || msg === 'playground'
}

module.exports.ensOrAddress = ensOrAddress
module.exports.getOSName = getOSName
module.exports.resolveEnsName = resolveEnsName
module.exports.isWallet = isWallet
module.exports.isVerticalName = isVerticalName
