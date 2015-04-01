/**************************************************************************/
/**************************************************************************/
 Function.prototype.inheritsFrom = function( parentClassOrObject ){ 
	if ( parentClassOrObject.constructor == Function ) { 
		//Normal Inheritance 
		this.prototype = new parentClassOrObject;
		this.prototype.constructor = this;
		this.prototype.parent = parentClassOrObject.prototype;
	} 
	else { 
		//Pure Virtual Inheritance 
		this.prototype = parentClassOrObject;
		this.prototype.constructor = this;
		this.prototype.parent = parentClassOrObject;
	} 
	return this;
}
/**************************************************************************/
/**************************************************************************/
Logger = {
	enabled: true,
	logType: 'both', // console, game, both	
	game: null,
	color: {error:'9E0606', notice:'01A9DB', important: 'FFA500'},
	init: function (game) {this.game = game;},
	log: function (msg, type) {
		var messageType = null;
		var color = null;
		if(type){
			messageType = type;
			color = this.color[type];
		}
		if (this.enabled && msg) {
			if(this.isLogType('game')) { 
				(messageType) ? this.game.msg(msg, messageType) : this.game.msg(msg);
			}
			if(this.isLogType('console')) { 
				(color) ? console.log('%c' + msg, 'color:#' + color) : console.log(msg);
			}
		}
	},
	isLogType: function (logType) {
		return this.enabled && (this.logType == 'both' || this.logType == logType);
	},
	setType: function (logType) {
		return this.logType = logType;
	},
	toggle: function () {
		this.log('Logging turned ' + (!this.enabled ? 'off': 'on'), 'notice');
		this.enabled = !this.enabled;
	}
}
/**************************************************************************/
/**************************************************************************/

function Resource () {
	this.name = '';
	this.amount = 0;
	this.limit = 0;
	this.enabled = true;
	this.game = null;
	this.logger = null;
}
Resource.prototype.init = function(data, log) {
	this.name = data.name;
	this.amount = data.amount;
	this.limit = data.limit;
	this.enabled = true;
	this.logger = log;
	this.game = log.game;	
}
Resource.prototype.toogle =  function() {
	this.enabled  = !this.enabled;
	this.logger.log(this.name + ' auto craft is turned ' + (this.enabled ? 'on' : 'off'));
}
Resource.prototype.toString = function() {
	var that = this
	var toStr = function (prop) { return ((prop != 'name') ? '	' : '%c ') + prop + ': ' + that[prop] + '\n';}
	console.log(toStr('name') + toStr('amount') + toStr('limit') + toStr('enabled'), 'color: #0D00BA');
}
Resource.prototype.isAll = function () {
	return this.amount == 'all';
}
Resource.prototype.prodMsg = function (craftedAmount) {
	var craftedAmount = parseFloat(craftedAmount).toFixed(3);
	if(craftedAmount > 0 && !this.isAll()) {
		craftedAmount = (craftedAmount == parseInt(craftedAmount)) ? parseInt(craftedAmount) : craftedAmount;
		return '+' + craftedAmount + ' ' + this.name + ' crafted.';
	}
}
Resource.prototype.isUnlocked = function() {
	return this.game.workshop.getCraft(this.name).unlocked && (this.game.science.get("construction").researched || this.name == 'wood');
}
Resource.prototype.isCraftable = function () {
	return this.isUnlocked() && this.enabled;
}
Resource.prototype.craft = function (expression) {
	if (this.isCraftable() && expression)
	{
		var crafted = this.getResPool(this.name).value;
		(this.isAll()) ? this.craftAll() : this.craftAmount();
		crafted = this.getResPool(this.name).value - crafted;
		this.logger.log(this.prodMsg(crafted));
		
	}
}
Resource.prototype.craftAll = function () {this.game.workshop.craftAll(this.name);}
Resource.prototype.craftAmount = function () {}
Resource.prototype.getResPool = function (name) {
	return this.game.resPool.get(name);
}
Resource.prototype.set = function (data) {
	var that = this;
	for(key in data){
		if(that.hasOwnProperty(key)) that[key] = data[key];
	}
}
Resource.prototype.save = function () {
	return new SaveObj(this)
}
Resource.prototype.load = function (obj) {
	this.init(obj, this.logger);
	this.enabled = obj.enabled;
}
Resource.prototype.getType = function () {
	return 'Resource';
}
/**************************************************************************/
/**************************************************************************/
/*
function Transient () {
	this.req = '';
	this.title = '';
	Resource.call(this);
}

Transient.inheritsFrom( Resource );
Transient.prototype.craft = function () {}
Transient.prototype.isUnlocked = function () {}
Transient.prototype.init = function (data, logger) {
	this.req = data.req;
	this.title = data.title;
	this.parent.init.call(this, data, logger);	
}

Transient.prototype.changeTab = function (tabName) {
	var active = '';
	if(tabName && !this.isTabActive(tabName)){
		active = this.game.activeTabId;
		this.game.activeTabId = tabName;
		this.game.render();
	}
	return active;
}
Transient.prototype.isTabActive = function (tabName) {
	return this.game.activeTabId == tabName;
}
*/
/**************************************************************************/
/**************************************************************************/
function Uncommon(data, logger)
{
	this.init(data, logger);
}
Uncommon.inheritsFrom( Resource );
Uncommon.prototype.craft = function ()
{
	var expression = this.hasEnoughResource(false);
	this.parent.craft.call(this, expression);
}
Uncommon.prototype.craftAmount = function ()
{
	var i = 0;
	while (this.hasEnoughResource(true) && i < parseInt(this.amount))
	{
		this.game.workshop.craft(this.name, 1);
		i++;
	}
}
Uncommon.prototype.hasEnoughResource = function (withLimit)
{
	var result = true;
	var limit = (withLimit) ? this.limit : 0;
	var resPrice = this.game.workshop.getCraft(this.name).prices;
	for (var i = 0; i < resPrice.length; i++) {
		result = result && this.checkPrice(resPrice[i], limit);
	}
	return result; 
}
Uncommon.prototype.checkPrice = function (base, limitValue)
{
	var amt = (limitValue) ? this.amount : 1;
	return ((this.game.resPool.get(base.name).value - limitValue) >= base.val * amt);
}
Uncommon.prototype.getType = function () {
	return 'Uncommon';
}
/**************************************************************************/
/**************************************************************************/
function Common(data, logger)
{
	this.init(data, logger);
}
Common.inheritsFrom( Resource );
Common.prototype.craft = function ()
{
	this.parent.craft.call(this, this.isOverLimit('ratio') && this.isOverLimit('production'));
}
Common.prototype.craftAmount = function ()
{
	var i = 0;
	while (this.isOverLimit('price') && i < parseInt(this.amount))
	{
		this.game.workshop.craft(this.name, 1);
		i++;
	}
}
Common.prototype.isOverLimit = function (limitType)
{
	var resPrice = this.game.workshop.getCraft(this.name).prices;
	var result = true;
	for (var i = 0; i < resPrice.length; i++) {
		result = result && this.checkLimit(limitType, resPrice[i]);
	}
	return result;
}
Common.prototype.checkLimit = function (limitType, base)
{
	var actNumber = this.getResPool(base.name).value;
	var limit = 0;
	switch(limitType) {
		case 'price':
			limit = base.val;
			break;
		case 'ratio':
			limit = this.getResPool(base.name).maxValue * this.limit;
			break;
		case 'production':
			actNumber = this.getResPool(base.name).perTickUI;
			break;
	}
	return actNumber >= limit;
}
Common.prototype.getType = function () {
	return 'Common';
}

/**************************************************************************/
/**************************************************************************/
function HuntingResolution()
{
	this.ivory = 0;
	this.furs = 0;
	this.unicorns = 0;
	this.count = 0;
}
HuntingResolution.prototype.add = function (huntingRes)
{
	this.furs += huntingRes.furs;
	this.ivory += huntingRes.ivory;
	if(huntingRes.isUnicorn) this.unicorns++;
	this.count++;
}
HuntingResolution.prototype.getMsg = function ()
{
	var msg = 'Your hunters have returned. They got ' + this.furs + ' furs';
	if (this.ivory) {
		msg += ' and ' + (this.ivory) + " ivory";
	}
	msg += ' on ' + this.count + ' hunting mission(s).';
	return msg;
}
HuntingResolution.prototype.getUnicornMsg = function ()
{
	return (this.unicorns) ? ('You got ' + this.unicorns + ' unicorn(s)!') : '';
}
/**************************************************************************/
/**************************************************************************/
function Manpower (logger) {
	var data = {name: 'manpower', amount: 3, limit: 0.8};
	this.init(data, logger);
	this.req = 'hunter' ;
	this.title = 'Small village';
}
Manpower.inheritsFrom( Resource );
Manpower.prototype.craft = function(){
	var catpower = this.getResPool(this.name);
	if (this.isCraftable() && catpower.value >= (catpower.maxValue * this.limit)) {
		(this.isAll()) ? this.game.village.huntAll() : this.craftAmount();
	}
}
Manpower.prototype.craftAmount = function () {
	var i = 0;
	var bkpTab = this.changeTab(this.title);
	var huntingRes = new HuntingResolution();
	var huntButton = this.game.villageTab.huntBtn;
	while (huntButton.enabled && huntButton.hasResources() && i < parseInt(this.amount)) {
		huntingRes.add(this.doHunt(huntButton));
		i++;
	}
	this.changeTab(bkpTab);
	this.logger.log(huntingRes.getUnicornMsg(), 'important');
	this.logger.log(huntingRes.getMsg());
}
Manpower.prototype.doHunt = function (huntButton) {
	var res = this.game.village.sendHuntersInternal();
	huntButton.payPrice();
	if (huntButton.priceRatio)
	{
		huntButton.adjustPrice(huntButton.priceRatio);
	}
	huntButton.update();
	return res;
}
Manpower.prototype.isUnlocked = function() { return this.game.village.getJob(this.req).unlocked;}
Manpower.prototype.changeTab = function (tabName) {
	var active = '';
	if(tabName && !this.isTabActive(tabName)){
		active = this.game.activeTabId;
		this.game.activeTabId = tabName;
		this.game.render();
	}
	return active;
}
Manpower.prototype.isTabActive = function (tabName) {
	return this.game.activeTabId == tabName;
}
Manpower.prototype.save = function () {
	return new SaveObj(this)
}
Manpower.prototype.getType = function () {
	return 'Manpower';
}
Manpower.prototype.load = function (obj) {
	this.init(obj, this.logger);
	this.enabled = obj.enabled;
	this.req = obj.req ;
	this.title = obj.title;
}
/**************************************************************************/
/**************************************************************************/

function Religion (logger)
{
	var data = {name: 'faith', amount: 0, limit: 0.1};
	this.init(data, logger);
	this.req = 'priest' ;
	this.title = 'Religion';
}
Religion.inheritsFrom( Resource );
Religion.prototype.craft = function ()
{
	var faith = this.getResPool(this.name);
	if (this.isCraftable() && faith.value >= (faith.maxValue * this.limit))
	{
		var bkpTab = this.changeTab(this.title);
		var amount = faith.maxValue * this.limit;
		this.game.religionTab.praiseBtn.onClick();
		this.changeTab(bkpTab);
		this.logger.log('Your kittens praised a lot, you got ' + amount + ' ' + this.name);
	}
}
Religion.prototype.isUnlocked = function() { return this.game.village.getJob(this.req).unlocked;}
Religion.prototype.changeTab = function (tabName) {
	var active = '';
	if(tabName && !this.isTabActive(tabName)){
		active = this.game.activeTabId;
		this.game.activeTabId = tabName;
		this.game.render();
	}
	return active;
}
Religion.prototype.isTabActive = function (tabName) {
	return this.game.activeTabId == tabName;
}
Religion.prototype.save = function () {
	return new SaveObj(this)
}
Religion.prototype.getType = function () {
	return 'Religion';
}
Religion.prototype.load = function (obj) {
	this.init(obj, this.logger);
	this.enabled = obj.enabled;
	this.req = obj.req ;
	this.title = obj.title;
}
/**************************************************************************/
/**************************************************************************/

function Trade (logger)
{
	var data = {name: 'trade', amount: 0, limit: 0.1};
	this.init(data, logger);
	this.mainPrice = 'gold';
	this.req = 'goldOre';
	this.title = 'Trade';
	this.races = [];
}
Trade.inheritsFrom( Resource );
Trade.prototype.craft = function ()
{
	var res = this.game.resPool.get(this.mainPrice);
	if(this.isCraftable() && res.value >= res.maxValue * this.limit){
		var bkpTab = this.changeTab(this.title);
		for(var i = 0; i < this.races.length; i++) {
			this.races[i].craft();
		}
		this.changeTab(bkpTab);
	}
}
Trade.prototype.changeTab = function (tabName) {
	var active = '';
	if(tabName && !this.isTabActive(tabName)){
		active = this.game.activeTabId;
		this.game.activeTabId = tabName;
		this.game.render();
	}
	return active;
}
Trade.prototype.isTabActive = function (tabName) {
	return this.game.activeTabId == tabName;
}
Trade.prototype.addRace = function (data)
{
	if(this.isRaceUnlocked(data.name) && !this.getRace(data.name)) {
		this.logger.log(data.name + ' race added.', 'notice');
		this.races.push(new Race(data, this.logger));
	}
	else this.logger.log('Race is not unlocked or already added.', 'notice');
}
Trade.prototype.isRaceUnlocked = function(name) {
	for (var i = 0; i < this.game.diplomacy.races.length; i++) {
		if (this.game.diplomacy.races[i].name == name.toLowerCase()) 
			return this.game.diplomacy.races[i].unlocked;
	}
	return false;
}
Trade.prototype.getRace = function(name) {
	for (var i = 0; i < this.races.length; i++) {
		if (this.races[i].name == name) 
			return this.races[i];
	}
	return false;
}
Trade.prototype.toggleRace = function(name) {
	var race = this.getRace(name);
	if(race) race.toggle();
}
Trade.prototype.isUnlocked = function() {
	return this.game.workshop.get(this.req).unlocked;
}
Trade.prototype.saveRaces = function() {
	var savedRaces = [];
	for (var i = 0; i < this.races.length; i++) {
		savedRaces.push(this.races[i].save());
	}
	return savedRaces;
}
Trade.prototype.save = function () {
	return new SaveObj(this)
}
Trade.prototype.getType = function () {
	return 'Trade';
}
Trade.prototype.load = function (obj) {
	this.init(obj, this.logger);
	this.enabled = obj.enabled;
	this.req = obj.req ;
	this.title = obj.title;
	this.mainPrice = obj.mainPrice;
	this.races = [];
	for (var i = 0; i < obj.races.length; i++) {
		this.addRace(obj.races[i], this.logger);
		this.races[i].enabled = obj.races[i].enabled;
	}
}
/**************************************************************************/
/**************************************************************************/

function Race(data, logger) {
	this.name = data.name.toLowerCase();
	this.amount = data.amount;
	this.enabled = true;
	this.game = logger.game;
	this.logger = logger;
	this.seasons = {spring: false, summer: false, autumn: false, winter: false};
	this.setSeasons(data.seasons);
}
Race.prototype.craft = function (){
	if(this.isTradingSeason() && this.enabled){
		var tradeBtn = this.getTradeBtn();
		(this.amount == 'all') ? tradeBtn.tradeAll() : this.tradeAmount(tradeBtn);
	}
}
Race.prototype.tradeAmount = function (tradeBtn){
	var i = 0;
	while( i < this.amount) {
		tradeBtn.onClick();
		i++;
	}
}
Race.prototype.isTradingSeason = function (){
	return this.seasons[this.game.calendar.getCurSeason().name];
}
Race.prototype.getTradeBtn = function (){
	for (var i = 0; i < this.game.diplomacyTab.racePanels.length; i++) {
		if (this.game.diplomacyTab.racePanels[i].name.toLowerCase() == this.name.toLowerCase()) 
			return this.game.diplomacyTab.racePanels[i].tradeBtn;
	}
	return null;
}
Race.prototype.toggle = function (){
	this.enabled = !this.enabled;
	this.logger.log('Trading with ' + this.name + ' ' + (this.enabled ? 'started' : 'stopped'), 'notice');
}
Race.prototype.setAmount = function (amount){
	this.amount = amount;
}
Race.prototype.setSeasons = function (seasons) {
	if(seasons) {
		for (sName in seasons) {
			this.seasons[sName] = seasons[sName];
		}
	}
}
Race.prototype.save = function (){
	return new SaveRace(this);
}
/**************************************************************************/
/**************************************************************************/

function Calendar (calendar)
{
	this.enabled = true;
	this.name = 'calendar';
	this.title = 'Observe';
	this.cal = calendar;
}
Calendar.prototype.craft = function ()
{
	if(this.enabled){
		var star = dojo.query("input[type=button]").attr("value");
		if(star.length > 0) {
			var i = 0;
			while( i < star.length && star[i] != this.title) { i++; }
				if(i < star.length) { 
					dojo.hitch(this.cal, this.cal.observeHandler)({}, true);
			}
		}
	}
}
Calendar.prototype.toggle = function () {
	this.enabled = !this.enabled
}
Calendar.prototype.save = function () {
	return new SaveObj(this)
}
Calendar.prototype.getType = function () {
	return 'Calendar';
}
Calendar.prototype.load = function (obj) {
	this.enabled = obj.enabled;
}
/**************************************************************************/
/**************************************************************************/
function SaveObj (obj) {
	this.name = obj.name;
	this.enabled = obj.enabled;
	this.type = obj.getType();
	if(obj.hasOwnProperty('amount'))this.amount = obj.amount;
	if(obj.hasOwnProperty('limit'))this.limit = obj.limit;
	if(obj.hasOwnProperty('req')) this.req = obj.req;
	if(obj.hasOwnProperty('title')) this.title = obj.title;
	if(obj.hasOwnProperty('mainPrice')) this.mainPrice = obj.mainPrice;
	if(obj.hasOwnProperty('races')) this.races = obj.saveRaces();
}
function SaveRace (obj) {
	this.name = obj.name;
	this.amount = obj.amount;
	this.enabled = obj.enabled;
	this.seasons = obj.seasons;
}

/**************************************************************************/
/**************************************************************************/
function KittenCraft(common, uncommon, logger)
{
	this.id = null;
	this.resource = [];
	this.refresh = 5000;
	this.logger = logger;
	this.game = logger.game;
	this.initResources(common, uncommon);	
}
KittenCraft.prototype.injectSomeInfo = function ()
{
	
}
KittenCraft.prototype.initResources = function (commonRes, uncommonRes)
{
	for (var i = 0; i < commonRes.length; i++) {
		this.resource.push(new Common(commonRes[i], this.logger));
	}
	
	for (var i = 0; i < uncommonRes.length; i++) {
		this.resource.push(new Uncommon(uncommonRes[i], this.logger));
	}
	this.resource.push(new Manpower(this.logger));
	this.resource.push(new Religion(this.logger));
	this.resource.push(new Calendar(this.game.calendar));
	this.resource.push(new Trade(this.logger));
}
KittenCraft.prototype.getRes = function (name)
{
	for (var i = 0; i < this.resource.length; i++) {
		if (this.resource[i].name == name) 
			return this.resource[i];
	}
	this.log('Can\'t find resource: ' + name, 'error');
	return null;
}
KittenCraft.prototype.setRes = function (name, data)
{
	var res = this.getRes(name);
	if (res) {
		res.set(data);
	}
} 
KittenCraft.prototype.craft = function ()
{
	for (var i = 0; i < this.resource.length; i++) {
		this.resource[i].craft();
	}
}
KittenCraft.prototype.log = function (msg, type)
{
	this.logger.log(msg, type);
}
KittenCraft.prototype.toggle = function (name)
{
	var res = this.getRes(name);
	if(res) res.toogle();
}
KittenCraft.prototype.disableAllRes = function ()
{
	for (var i = 0; i < this.resource.length; i++) {
		this.resource[i].enabled = false;
	}
	this.log('All resource automation disabled', 'notice');
}
KittenCraft.prototype.start = function ()
{
	if (this.id) this.stop();
	var that = this;
	this.id = window.setInterval(function () { that.craft();}, this.refresh);
	this.log('Refresh interval is set to ' + this.refresh/1000 + ' sec', 'notice');
	this.log('KittenCraft started.', 'notice');
}
KittenCraft.prototype.stop = function ()
{
	window.clearInterval(this.id);
	this.id = null;
	this.log('KittenCraft stopped.', 'notice');
}
KittenCraft.prototype.setRefresh = function (refresh)
{
	this.refresh = refresh;
	if(this.id) this.start();
}
KittenCraft.prototype.export = function ()
{
	this.stop();
	var settings = new Object();
	for (var i = 0; i < this.resource.length; i++) {
		var saveObj = this.resource[i].save();
		settings[saveObj.name] = saveObj;
	}
	settings['refresh'] = this.refresh;
	this.start();
	console.log(btoa(JSON.stringify(settings)));
}
KittenCraft.prototype.import = function (settings)
{
	this.stop();
	var sett = JSON.parse(atob(settings));
	for (name in sett) {
		var res = this.getRes(name);
		if(name == 'refresh') this.setRefresh(sett['refresh']);
		else if(res){ 
			res.load(sett[name]);
		}
		else {
			this.resource.push(new window[sett[name].type](sett[name], this.logger));
		}
	}
	this.start();
}

// Configure stuff
Logger.init(gamePage);
var common = [{name: 'wood',  amount: 100, 	limit: 0.8},
			  {name: 'beam',  amount: 25, 	limit: 0.8},
			  {name: 'slab',  amount: 25, 	limit: 0.8},
			  {name: 'steel', amount: 'all',limit: 0.8},
			  {name: 'plate', amount: 10, 	limit: 0.8}];
var uncommon  = [{name: 'parchment',  amount: 50, 	 limit: 5000},
				 {name: 'manuscript', amount: 'all', limit: 0},
				 {name: 'compedium',  amount: 'all', limit: 0}
				 ];
var kittenCraft = new KittenCraft(common, uncommon, Logger);
kittenCraft.getRes('faith').set({amount: 0, limit: 0.1});
kittenCraft.getRes('manpower').set({amount: 3, limit: 0.8});

kittenCraft.getRes('trade').set({limit: 0.8});
kittenCraft.getRes('trade').addRace({name: 'Zebras', amount: 1, seasons:{spring: true, summer: true, autumn: true, winter: true}});
kittenCraft.getRes('trade').addRace({name: 'Sharks', amount: 1, seasons: {winter: true}});

kittenCraft.start();

