//Cache keys
const transfersKey = 'nft-backer-transfers';
const busyFlagKey = 'transfers-is-busy';

const atomicEndpoints = [
	"https://aa.waxdaobp.io",
	"https://atomic.hivebp.io",
	"https://wax.eosusa.io",
	"https://wax-atomic-api.eosphere.io",
	"https://atomic3.hivebp.io"
]

const contractsToIgnoreBurnsFrom = [
	"atomicpacksx",
	"b.taco",
	"battleminers",
	"bcbrawlers",
	"blend.nefty",
	"blenderizerx",
	"burn.atomic",
	"cntrc.parsec",
	"combz.taco",
	"craft.nft",
	"craft.tag",
	"darkminingsc",
	"f.taco",
	"g.taco",
	"farmersworld",
	"game.pirates",
	"h.musicmogul",
	"miningvoxels",
	"msourceforge",
	"msourcegoods",
	"msourceguild",
	"msourceherox",
	"msourcemerge",
	"neftyblocksd",
	"neftyblocksp",
	"nfthivecraft",
	"nfthivedrops",
	"nfthivepacks",
	"nftpandawofg",
	"niftykickgam",
	"niftykicksgm",
	"promo.nova",
	"radaunpacker",
	"radaquesttcg",
	"realmutility",
	"s.federation",
	"spinniaworld",
	"warsaken",
	"waxdaomarket",
	"weedborngame",
	"wombatblends",

];

module.exports = {
	transfersKey,
	busyFlagKey,
	contractsToIgnoreBurnsFrom,
	atomicEndpoints
}