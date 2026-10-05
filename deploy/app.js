import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeErrorResult,
  encodeDeployData,
  formatEther,
  formatGwei,
  getAddress,
  isAddress,
} from 'https://esm.sh/viem@2.57.3';
import * as viemChains from 'https://esm.sh/viem@2.57.3/chains';
import { COMPILER, CONTRACTS } from './contracts.js';

// existing mainnet contracts the new ones read from
const MAINNET_TRAITS = '0x60de3cd89bc8042a1cad6375fbcc11ea29c43e99';
const MAINNET_RENDERER = '0x5694010444cC8fbbed96c23a65FbC3714F624A26';

const STEPS = [
  {
    id: 'data1',
    contract: 'RadioactivePunksLayerData1',
    title: '1. Layer data, part 1',
    description: 'The first 24 KB of packed layer art. No parameters.',
    params: [],
  },
  {
    id: 'data2',
    contract: 'RadioactivePunksLayerData2',
    title: '2. Layer data, part 2',
    description: 'The remaining 17.5 KB of packed layer art. No parameters.',
    params: [],
  },
  {
    id: 'image',
    contract: 'RadioactivePunksImage',
    title: '3. Image renderer',
    description: 'Renders each punk as an SVG. Reads trait bytes from the existing trait data contract.',
    params: [
      { name: 'traits', label: 'Trait data (RadioactivePunksBytesHyperstructure)', mainnetDefault: MAINNET_TRAITS, check: 'code' },
      { name: 'layerData1', label: 'Layer data, part 1', from: 'data1', check: 'RadioactivePunksLayerData1' },
      { name: 'layerData2', label: 'Layer data, part 2', from: 'data2', check: 'RadioactivePunksLayerData2' },
    ],
  },
  {
    id: 'json',
    contract: 'RadioactivePunksJSONV2',
    title: '4. JSON metadata',
    description: 'Serves tokenJSON with the image. Reads trait names and values from the original renderer.',
    params: [
      { name: 'renderer', label: 'Original renderer (RadioactivePunksRenderer)', mainnetDefault: MAINNET_RENDERER, check: 'code' },
      { name: 'image', label: 'Image renderer', from: 'image', check: 'RadioactivePunksImage' },
    ],
  },
];

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const state = {
  wallet: null,       // { info, provider }
  account: null,
  chain: null,
  walletClient: null,
  publicClient: null,
  deployed: {},       // step id -> { address, hash }
};

// ---------- persistence (per chain) ----------

const storageKey = () => `rpunks-image-deploy-${state.chain?.id}`;
const loadDeployed = () => {
  try { return JSON.parse(localStorage.getItem(storageKey())) || {}; } catch { return {}; }
};
const saveDeployed = () => {
  try { localStorage.setItem(storageKey(), JSON.stringify(state.deployed)); } catch { /* storage unavailable */ }
};

// ---------- helpers ----------

const explorer = () => state.chain?.blockExplorers?.default?.url;
const link = (kind, value) => {
  const base = explorer();
  return base
    ? el('a', { href: `${base}/${kind}/${value}`, target: '_blank', rel: 'noopener', textContent: value })
    : el('span', { className: 'mono', textContent: value });
};

const setStatus = (node, kind, ...content) => {
  node.className = `status ${kind}`;
  node.replaceChildren(...content);
};

const errorMessage = (e, abi) => {
  // revert data is at error.data on most nodes, error.data.data on Hardhat
  const hex = (v) => (typeof v === 'string' && /^0x[0-9a-f]*$/i.test(v) ? v : undefined);
  let data;
  e?.walk?.((err) => { data = data || hex(err?.data) || hex(err?.data?.data); return false; });
  if (data && abi) {
    try { return `Reverted with ${decodeErrorResult({ abi, data }).errorName}()`; } catch { /* not one of ours */ }
  }
  return e?.shortMessage || e?.message || String(e);
};

/** Does the code at an address match the tested build? Immutable values are ignored. */
function matchesBuild(name, code) {
  const { expectedCode, immutableRanges } = CONTRACTS[name];
  let hex = (code || '0x').slice(2).toLowerCase();
  const expected = expectedCode.slice(2).toLowerCase();
  if (hex.length !== expected.length) return false;
  for (const { start, length } of immutableRanges) {
    hex = hex.slice(0, start * 2) + '0'.repeat(length * 2) + hex.slice((start + length) * 2);
  }
  return hex === expected;
}

// ---------- wallet ----------

const wallets = new Map();

function renderWallets() {
  const list = [...wallets.values()].sort((a, b) =>
    (b.info.rdns === 'me.rainbow') - (a.info.rdns === 'me.rainbow') || a.info.name.localeCompare(b.info.name));
  $('wallets').replaceChildren(...(list.length ? list.map((w) => {
    const button = el('button', { onclick: () => connect(w) });
    if (w.info.icon) button.append(el('img', { src: w.info.icon, alt: '' }));
    button.append(`Connect ${w.info.name}`);
    return button;
  }) : [el('span', { className: 'muted', textContent: 'No wallet found. Install or unlock Rainbow, then reload.' })]));
}

window.addEventListener('eip6963:announceProvider', (event) => {
  wallets.set(event.detail.info.uuid, event.detail);
  renderWallets();
});
window.dispatchEvent(new Event('eip6963:requestProvider'));
setTimeout(() => {
  if (!wallets.size && window.ethereum) {
    wallets.set('injected', { info: { uuid: 'injected', name: 'browser wallet' }, provider: window.ethereum });
  }
  renderWallets();
}, 500);

async function connect(wallet) {
  try {
    const [account] = await wallet.provider.request({ method: 'eth_requestAccounts' });
    state.wallet = wallet;
    state.account = getAddress(account);
    await useChain(Number(await wallet.provider.request({ method: 'eth_chainId' })));
    wallet.provider.on?.('accountsChanged', (accounts) => {
      if (!accounts.length) return location.reload();
      state.account = getAddress(accounts[0]);
      useChain(state.chain.id);
    });
    wallet.provider.on?.('chainChanged', (id) => useChain(Number(id)));
  } catch (e) {
    alertStatus(errorMessage(e));
  }
}

function alertStatus(message) {
  $('wallet-picker').append(el('div', { className: 'status err', textContent: message }));
}

async function useChain(chainId) {
  state.chain = Object.values(viemChains).find((c) => c?.id === chainId) || {
    id: chainId, name: `Chain ${chainId}`, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [] } },
  };
  const transport = custom(state.wallet.provider);
  state.walletClient = createWalletClient({ account: state.account, chain: state.chain, transport });
  state.publicClient = createPublicClient({ chain: state.chain, transport });
  state.deployed = loadDeployed();

  $('wallet-picker').hidden = true;
  $('wallet-connected').hidden = false;
  $('account').textContent = state.account;
  $('network').textContent = `${state.chain.name} (${chainId})`;

  const warning = $('chain-warning');
  if (chainId === 1) {
    warning.replaceChildren();
  } else {
    setStatus(warning, 'warn',
      'You’re not on Ethereum mainnet. The default addresses for the trait data and the original renderer only exist on mainnet. ',
      el('button', { className: 'secondary', textContent: 'Switch to Ethereum', onclick: () => state.walletClient.switchChain({ id: 1 }).catch((e) => setStatus(warning, 'err', errorMessage(e))) }));
  }

  renderSteps();
}

// ---------- deploy steps ----------

function renderSteps() {
  $('steps').replaceChildren(...STEPS.map(renderStep));
  STEPS.forEach((step) => validate(step));
  updateCheck();
}

function renderStep(step) {
  const done = state.deployed[step.id];
  const card = el('section', { className: 'card', id: `step-${step.id}` });
  card.append(
    el('div', { className: 'step-head' }, [
      el('h2', { textContent: step.title }),
      el('span', { className: `badge${done ? ' done' : ''}`, textContent: done ? 'Deployed' : step.contract }),
    ]),
    el('p', { className: 'muted', textContent: step.description }),
  );

  for (const param of step.params) {
    const value = (param.from && state.deployed[param.from]?.address)
      || (state.chain?.id === 1 && param.mainnetDefault) || '';
    const input = el('input', { id: `${step.id}-${param.name}`, value, placeholder: '0x…', spellcheck: false, autocomplete: 'off' });
    input.addEventListener('input', () => validate(step));
    card.append(
      el('label', { htmlFor: input.id, textContent: param.label }),
      input,
      el('div', { className: 'hint', id: `${input.id}-hint` }),
    );
  }

  const button = el('button', { id: `${step.id}-deploy`, className: done ? 'secondary' : '', textContent: done ? 'Deploy again' : 'Deploy', disabled: true });
  button.addEventListener('click', () => deploy(step));
  card.append(
    el('div', { className: 'row', style: 'margin-top: 16px' }, [button]),
    el('div', { className: 'status', id: `${step.id}-estimate` }),
    el('div', { className: 'status', id: `${step.id}-status` }),
  );

  if (done) {
    setStatus(card.querySelector(`#${step.id}-status`), 'ok',
      'Deployed at ', link('address', done.address), el('br'), 'Transaction ', link('tx', done.hash));
  }
  return card;
}

const validationRuns = {};

/** Checks each parameter on-chain, then estimates the deploy's gas and cost. */
async function validate(step) {
  const run = (validationRuns[step.id] = (validationRuns[step.id] || 0) + 1);
  const button = $(`${step.id}-deploy`);
  const estimate = $(`${step.id}-estimate`);
  button.disabled = true;
  if (!state.publicClient) return;

  const args = [];
  let valid = true;
  for (const param of step.params) {
    const input = $(`${step.id}-${param.name}`);
    const hint = $(`${input.id}-hint`);
    const value = input.value.trim();
    hint.className = 'hint';
    input.classList.remove('invalid');

    if (!isAddress(value)) {
      valid = false;
      hint.textContent = value ? 'Not a valid address.' : (param.from ? 'Filled in automatically once the earlier step is deployed.' : 'Required.');
      if (value) { input.classList.add('invalid'); hint.className = 'hint err'; }
      continue;
    }

    const code = await state.publicClient.getCode({ address: value }).catch(() => undefined);
    if (run !== validationRuns[step.id]) return;
    if (!code || code === '0x') {
      valid = false;
      input.classList.add('invalid');
      hint.className = 'hint err';
      hint.textContent = 'No contract at this address on this network.';
    } else if (param.check !== 'code' && !matchesBuild(param.check, code)) {
      valid = false;
      input.classList.add('invalid');
      hint.className = 'hint err';
      hint.textContent = `This isn’t the tested ${param.check}.`;
    } else {
      hint.className = 'hint ok';
      hint.textContent = param.check === 'code' ? `Contract found (${(code.length - 2) / 2} bytes).` : `Matches the tested ${param.check}.`;
    }
    args.push(getAddress(value));
  }

  if (!valid) {
    estimate.replaceChildren();
    return;
  }

  setStatus(estimate, 'info', 'Estimating gas…');
  const { abi, bytecode } = CONTRACTS[step.contract];
  try {
    const data = encodeDeployData({ abi, bytecode, args });
    const [gas, gasPrice] = await Promise.all([
      state.publicClient.estimateGas({ account: state.account, data }),
      state.publicClient.getGasPrice(),
    ]);
    if (run !== validationRuns[step.id]) return;
    setStatus(estimate, 'info',
      `Estimated ${gas.toLocaleString()} gas, about ${Number(formatEther(gas * gasPrice)).toFixed(6)} ${state.chain.nativeCurrency.symbol} at ${Number(formatGwei(gasPrice)).toFixed(3)} gwei.`);
    button.disabled = false;
  } catch (e) {
    if (run !== validationRuns[step.id]) return;
    setStatus(estimate, 'err', `This deploy would fail: ${errorMessage(e, abi)}`);
  }
}

async function deploy(step) {
  const button = $(`${step.id}-deploy`);
  const status = $(`${step.id}-status`);
  const { abi, bytecode } = CONTRACTS[step.contract];
  const args = step.params.map((p) => getAddress($(`${step.id}-${p.name}`).value.trim()));

  button.disabled = true;
  setStatus(status, 'info', 'Confirm the transaction in your wallet…');
  try {
    const hash = await state.walletClient.deployContract({ abi, bytecode, args, account: state.account, chain: state.chain });
    setStatus(status, 'info', 'Waiting for the transaction to be mined… ', link('tx', hash));
    const receipt = await state.publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error(`Transaction ${hash} failed.`);

    const address = getAddress(receipt.contractAddress);
    const code = await state.publicClient.getCode({ address });
    if (!matchesBuild(step.contract, code)) {
      setStatus(status, 'err', 'Deployed, but the code at ', link('address', address), ' doesn’t match the tested build. Don’t use it.');
      return;
    }

    state.deployed[step.id] = { address, hash };
    saveDeployed();
    renderSteps();
    $(`step-${step.id}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) {
    setStatus(status, 'err', errorMessage(e, abi));
    button.disabled = false;
  }
}

// ---------- final check ----------

function updateCheck() {
  const json = state.deployed.json?.address;
  $('check-button').disabled = !json;
  $('base-url').hidden = !json;
  if (json) $('base-url-value').value = `web3://${json}/tokenJSON/string!`;
}

$('check-button').addEventListener('click', async () => {
  const status = $('check-status');
  const id = $('check-token').value.trim();
  $('check-punk').hidden = true;
  setStatus(status, 'info', 'Reading tokenJSON…');
  try {
    const text = await state.publicClient.readContract({
      address: state.deployed.json.address,
      abi: CONTRACTS.RadioactivePunksJSONV2.abi,
      functionName: 'tokenJSON',
      args: [`${id}.json`],
    });
    const meta = JSON.parse(text);
    $('check-image').src = meta.image;
    $('check-name').textContent = meta.name;
    $('check-traits').textContent = meta.attributes.filter((a) => a.value !== 'None').map((a) => `${a.trait_type}: ${a.value}`).join(' · ');
    $('check-punk').hidden = false;
    setStatus(status, 'ok', `Valid JSON (${text.length.toLocaleString()} characters) with an image and no animation_url.`);
  } catch (e) {
    setStatus(status, 'err', errorMessage(e, [...CONTRACTS.RadioactivePunksJSONV2.abi, ...CONTRACTS.RadioactivePunksImage.abi]));
  }
});

$('copy-base-url').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('base-url-value').value);
  $('copy-base-url').textContent = 'Copied';
  setTimeout(() => { $('copy-base-url').textContent = 'Copy'; }, 1500);
});

// ---------- compiler info ----------

$('compiler').append(
  el('dt', { textContent: 'Compiler' }), el('dd', { className: 'mono', textContent: `v${COMPILER.solc}` }),
  el('dt', { textContent: 'Optimizer' }), el('dd', { textContent: `Enabled, ${COMPILER.optimizerRuns} runs` }),
  el('dt', { textContent: 'EVM version' }), el('dd', { textContent: COMPILER.evmVersion }),
  el('dt', { textContent: 'Standard-JSON' }), el('dd', {}, [COMPILER.standardInput
    ? el('a', { href: COMPILER.standardInput, download: 'radioactive-punks-image-standard-input.json', textContent: 'Download Standard-JSON input' })
    : el('span', { className: 'muted', textContent: 'Rebuild with a clean compile to generate it.' })]),
);
