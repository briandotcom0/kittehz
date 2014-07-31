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
	toggleConsole: function () {
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
	return this.game.workshop.getCraft(this.name).unlocked;
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
	return ((this.game.resPool.get(base.name).value - limitValue) >= base.val);
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
	var huntButton = this.game.villageTab.hutnBtn;
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
	var bkpTab = this.changeTab(this.title);
	var res = this.game.resPool.get(this.mainPrice);
	if(this.isCraftable() && res.value >= res.maxValue * this.limit){
		for(var i = 0; i < this.races.length; i++) {
			this.races[i].craft();
		}
	}
	this.changeTab(bkpTab);
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
	if(this.isTradingSeason()){
		//console.log('  isTradingSeason:' + this.isTradingSeason());
		var tradeBtn = this.getTradeBtn();
		//console.log(tradeBtn);
		(this.amount == 'all') ? tradeBtn.tradeAll() : this.tradeAmount(tradeBtn);
	}
}
Race.prototype.tradeAmount = function (tradeBtn){
	var i = 0;
	while( i < this.amount) {
		//console.log(i);
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
Race.prototype.setSeasons = function (seasons) {
	if(seasons) {
		for (sName in seasons) {
			this.seasons[sName] = seasons[sName]; 
			this.logger.log('Trading with ' + this.name + ' in ' + sName + ' ' + (this.seasons[sName] ? 'started' : 'stopped'), 'notice');
		}
	}
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

/**************************************************************************/
/**************************************************************************/
function KittenCraft(common, uncommon, logger)
{
	this.id = null;
	this.resource = [];
	this.refresh = 3000;
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
	this.log('Can\'t find resource ' + name, 'error');
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
	this.log('Refresh interval is ' + this.refresh/1000 + ' sec', 'notice');
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
//some logging
//Logger.logType can be: console, game, both
//Logger.enabled enable/disable logging
Logger.init(gamePage);
// name: name of the resource in game. Except for compedium, its the same, that appears on UI
// amount: represents the the +,+25,+100 next to the materials also accepts 'all' to craft al your resources to this material
// upper limit in % ([0;1]), if resource reaches maxValue(storage cap) * limit, it crafts amount number material
var common = [{name: 'wood',  amount: 100, 	limit: 0.8},
			  {name: 'beam',  amount: 25, 	limit: 0.8},
			  {name: 'slab',  amount: 25, 	limit: 0.8},
			  {name: 'steel', amount: 'all',limit: 0.8},
			  {name: 'plate', amount: 10, 	limit: 0.8}];
// name and amount is the same as @ common
// limit here is a down limit you always have from its price resources
// zumbeispiel: @perchament limit is 5000 means your furs amount never can go under 5000
var uncommon  = [{name: 'parchment',  amount: 50, 	 limit: 5000},
				 {name: 'manuscript', amount: 'all', limit: 0},
				 {name: 'compedium',  amount: 'all', limit: 0}
				 ];
var kittenCraft = new KittenCraft(common, uncommon, Logger);
//at trading limit refers only to gold (goldMaxValue * limit) then it trades amount times specified @racees
//seasons: races trades only in the seasons with true value.
kittenCraft.getRes('trade').set({limit: 0.8});
kittenCraft.getRes('trade').addRace({name: 'Zebras', amount: 1, seasons:{spring: true, summer: true, autumn: true, winter: true}});
kittenCraft.getRes('trade').addRace({name: 'Sharks', amount: 1, seasons: {winter: true}});
//
// You can turn on and off sepcified resource automations:
// kittenCraft.toggle('wood')
//
// You can set parameters for resources
// kittenCraft.gerRes('wood').set({limit: 0.7, amount: 200})
// or
// kittenCraft.getRes('wood').amount = 200
// kittenCraft.getRes('wood').limit = 0.8
//
// kittenCraft also hunts, praises, and collects starcharts
// var data = {name: 'trade', amount: 0, limit: 0.1}; ==> no need for amount, it is specified per race
// var data = {name: 'faith', amount: 0, limit: 0.1}; ==> no need for amount, you can only praise all of you faith
// var data = {name: 'manpower', amount: 3, limit: 0.8}; ==> amount 3 means 300 manpower used to hunt
// you can give these too to the getRes's set
//
// calendar is very simple, and has just few properties
// you can turn it on and off ==> kittenCraft.toggle('calendar')
//
// refresh rate is 3secs for kitten craft change it as you wish
// kittenCraft.setRefresh(5000) => 5sec
kittenCraft.start();
//
// kittenCraft.stop() to stop this nightmare...
//kittenCraft.getRes('parchment').set({limit:4000})
