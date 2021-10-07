import { attackRoll, checkResoluteModifiers, getPowerLevel, markScripted } from './item.js';
import { prepareRollAttribute } from "../common/dialog.js";
import { upgradeDice } from './roll.js';

export class SymbaroumActor extends Actor {
  
    prepareData() {
        // console.log("In prepareData");
        super.prepareData();
        // this.data.items.forEach(item => item.prepareFinalAttributes());
        // let data = foundry.utils.deepClone(this.data);
        // console.log("Init data");
        this._initializeData(this.data);
        // console.log("Init data - complete");
        this.data.numRituals = 0;
        // console.log("Compute items");
        console.log("original items",this.data.items);
        let items = this.data.items.contents.sort( (a, b) => {
            if(a.data.type == b.data.type) {
                return a.data.name == b.data.name ? 0 : a.data.name < b.data.name ? -1:1;
            } else {                
                return  (game.symbaroum.config.itemSortOrder.indexOf(a.data.type) - game.symbaroum.config.itemSortOrder.indexOf(b.data.type));
            }
        });
        this._computeItems(items);
        // console.log("Compute items - complete");
        // console.log("Compute _computeSecondaryAttributes");
        this._computeSecondaryAttributes(this.data);
        // console.log("Compute _computeSecondaryAttributes");
        // console.log("Out prepareData");
        this.data.isDataPrepared = true;
    }

    _initializeData(data) {
        data.data.combat = {
            id: null,
            name: "Armor",
            data: {
                baseProtection: "0",
                bonusProtection: "",
                impeding: 0,
                impedingMov: 0,
                impedingMagic: 0,
                qualities: {
                    flexible: false,
                    cumbersome: false,
                    concealed: false,
                    reinforced: false,
                    hallowed: false,
                    retributive: false,
                    desecrated: false
                }
            }
        };
        data.data.bonus = {
            defense: 0,
            defense_msg: "",
            accurate: 0,
            accurate_msg: "",
            cunning: 0,
            cunning_msg: "",
            discreet: 0,
            discreet_msg: "",
            persuasive: 0,
            persuasive_msg: "",
            quick: 0,
            quick_msg: "",
            resolute: 0,
            resolute_msg: "",
            strong: 0,
            strong_msg: "",
            vigilant: 0,
            vigilant_msg: "",
            toughness: { 
              max: 0, 
              max_msg: "",
              threshold: 0,
              threshold_msg: "" 
            },
            corruption: { 
              max: 0, 
              max_msg: "",
              threshold: 0,
              threshold_msg: ""
            },
            experience: { 
              value: 0,
              value_msg: "",
              cost: 0,
              cost_msg: ""
            }
        };
    }

    _computeItems(items) {
        // for (let item of Object.values(items)) {
        for( const [key, item] of items.entries() ) {
            item.prepareData();
            if((item.data.isAbility||item.data.isMysticalPower||item.data.isTrait) && !item.data.data?.script) markScripted(item);
            if (item.data.isPower) this._computePower(this.data, item.data);
            if (item.data.isGear) this._computeGear(this.data, item.data);
        }
    }

    _computeSecondaryAttributes(data) {
        for (var aKey in data.data.attributes) {
            // If there are corrupt attributes added, ignore this
            if (!!!data.data.attributes[aKey].value || !!!data.data.attributes[aKey].label) continue;

            data.data.attributes[aKey].bonus = data.data.bonus[aKey];
            data.data.attributes[aKey].total = data.data.attributes[aKey].value + data.data.bonus[aKey] + data.data.attributes[aKey].temporaryMod;
            data.data.attributes[aKey].modifier = 10 - data.data.attributes[aKey].total;
            if(data.type === "monster") {
                let modSign = "";
                if(data.data.attributes[aKey].modifier > 0) {
                    modSign = "+";
                }
                data.data.attributes[aKey].msg = game.i18n.localize("TOOLTIP.BONUS_TOTAL")+ ` ${data.data.attributes[aKey].total} (${modSign}${data.data.attributes[aKey].modifier})<br />${game.i18n.localize("ATTRIBUTE.BASE")}(${data.data.attributes[aKey].value.toString()}) ${data.data.bonus[aKey + "_msg"]}`;
            } else {
                data.data.attributes[aKey].msg = game.i18n.localize("TOOLTIP.BONUS_TOTAL")+ ` ${data.data.attributes[aKey].total}`+"<br />"+game.i18n.localize("ATTRIBUTE.BASE")+"("+data.data.attributes[aKey].value.toString()+")"+`${data.data.bonus[aKey + "_msg"]}`;
            }
            if(data.data.attributes[aKey].temporaryMod != 0 ){data.data.attributes[aKey].msg += "<br />"+game.i18n.localize("ATTRIBUTE.MODIFIER")+"("+data.data.attributes[aKey].temporaryMod.toString()+")"};
        }
        
        // Toughness max
        let strong = data.data.attributes.strong.total;
        let sturdy = this.data.items.filter(item => item.data.data.reference === "sturdy");
        if(sturdy.length != 0){
            let sturdyLvl = getPowerLevel(sturdy[0]).level;
            if(sturdyLvl == 1) data.data.health.toughness.max = Math.ceil(strong*(1.5)) + data.data.bonus.toughness.max;
            else if(sturdyLvl > 1) data.data.health.toughness.max = strong*(sturdyLvl) + data.data.bonus.toughness.max;
        }
        else data.data.health.toughness.max = (strong > 10 ? strong : 10) + data.data.bonus.toughness.max;
        let featSt = this.data.items.filter(item => item.data.data.reference === "featofstrength");
        if(featSt.length != 0 && featSt[0].data.data.novice.isActive) data.data.health.toughness.max += 5;

        let noPain = this.data.items.filter(element => element.data.data.reference === "nopainthreshold");
        data.hasNoPainThreshold = noPain.length > 0;
        if(noPain.length > 0){            
            data.data.health.toughness.threshold = 0;
        } else data.data.health.toughness.threshold = Math.ceil(strong / 2) + data.data.bonus.toughness.threshold;
        
        // Corruption Max
        let fullCorrupt = (this.data.items.filter(element => element.data.data.reference === "thoroughlycorrupt"));
        data.isThoroughlyCorrupt = fullCorrupt.length > 0;
        if(fullCorrupt.length > 0){
            data.data.health.corruption.threshold = 0;
            data.data.health.corruption.max = 0;
        } else{
            let resolute = data.data.attributes.resolute.total;
            
            let strongGift = this.data.items.filter(item => item.data.data.reference === "stronggift");
            if(strongGift.length != 0){
                if(strongGift[0].data.data.adept.isActive) resolute = resolute*2;
            }
            data.data.health.corruption.threshold = Math.ceil(resolute / 2) + data.data.bonus.corruption.threshold;
            data.data.health.corruption.max = resolute + data.data.bonus.corruption.max;
        }
        let corr = data.data.health.corruption;
        corr.value = corr.temporary + corr.longterm + corr.permanent;

        data.data.experience.spent = data.data.bonus.experience.cost - data.data.bonus.experience.value;
        data.data.experience.available = data.data.experience.total - data.data.experience.artifactrr - data.data.experience.spent;
        
        let extraArmorBonus = this._getExtraArmorBonuses();
        let activeArmor = this._getActiveArmor(data, extraArmorBonus);
        let defense = this._getDefenseValue(data, activeArmor);
        let damageProt = this._getDamageProtection();
        let totDefense = defense.attDefValue - activeArmor.impedingMov + data.data.bonus.defense;        

        data.data.combat = {
            id: activeArmor.id,
            img: activeArmor.img,
            armor: activeArmor.name,
            protectionPc: activeArmor.pc,
            protectionNpc: activeArmor.npc,
            unfavourPcProt: activeArmor.unfavourPcProt,
            impeding: activeArmor.impeding,
            impedingMov: activeArmor.impedingMov,
            impedingMagic: activeArmor.impedingMagic,
            tooltipProt: activeArmor.tooltip,
            defense: totDefense,
            defenseAttribute: {
                attribute: defense.attribute,
                label: data.data.attributes[defense.attribute].label
            },
            defmod: (10 - totDefense),
            msg: defense.defMsg,
            damageProt: damageProt
        };
        const activeWeapons = this._getWeapons(data);
        data.data.weapons = [];
        if(activeWeapons.length > 0){
            data.data.weapons = this.evaluateWeapons(activeWeapons);
        }
        if(!game.settings.get('symbaroum', 'manualInitValue')){
            this._getInitiativeAttribute();
        }
        let attributeInit = data.data.initiative.attribute.toLowerCase();
        data.data.initiative.value = ((data.data.attributes[attributeInit].total) + (data.data.attributes.vigilant.total /100)) ;
        data.data.initiative.label = data.data.attributes[attributeInit].label;

        let rrAbility = this.items.filter(item => item.data.data.reference === "rapidreflexes");
        if(rrAbility.length != 0){
            if(rrAbility[0].data.data.master.isActive) data.data.initiative.value += 20
        }
    }

    _computePower(data, item) {
        if (item.isRitual) {
            item.data.actions = "Ritual";
            this.data.numRituals = this.data.numRituals + 1;
            if( this.data.numRituals > 6 ) {
                // This needs to check if running with alternative rules for additional rituals, APG p.102                
                item.data.bonus.experience.cost = game.settings.get('symbaroum', 'optionalMoreRituals') ? 10 : 0;
            }
        }
        
        this._addBonus(data, item);
    }

    _computeGear(data, item) {
        if (item.isActive) {
            this._addBonus(data, item);
        }
    }
    
    evaluateWeapons(activeWeapons) {
        let weaponArray = [];
        // check for abilities that gives bonuses to rolls
        let ironFistLvl = 0;
        let ironFist = this.data.items.filter(element => element.data.data?.reference === "ironfist");
        if(ironFist.length > 0){
            let powerLvl = getPowerLevel(ironFist[0]);
            ironFistLvl = powerLvl.level;
        }
        let marksmanLvl = 0;
        let marksman = this.data.items.filter(element => element.data.data?.reference === "marksman");
        if(marksman.length > 0){
            let powerLvl = getPowerLevel(marksman[0]);
            marksmanLvl = powerLvl.level;
        }
        let polearmmasteryLvl = 0;
        let polearmmastery = this.data.items.filter(element => element.data.data?.reference === "polearmmastery");
        if(polearmmastery.length > 0){
            let powerLvl = getPowerLevel(polearmmastery[0]);
            polearmmasteryLvl = powerLvl.level;
        }
        let shieldfighterLvl = 0;
        let shieldfighter = this.data.items.filter(element => element.data.data?.reference === "shieldfighter");
        if(shieldfighter.length > 0){
            let haveShieldEquipped = this.data.items.filter(element => element.data.data?.reference === "shield" && element.data.isActive)
            if(haveShieldEquipped.length > 0){
                let powerLvl = getPowerLevel(shieldfighter[0]);
                shieldfighterLvl = powerLvl.level;
            }
        }
        let twohandedforceLvl = 0;
        let twohandedforce = this.data.items.filter(element => element.data.data?.reference === "twohandedforce");
        if(twohandedforce.length > 0){
            let powerLvl = getPowerLevel(twohandedforce[0]);
            twohandedforceLvl = powerLvl.level;
        }
        let robustLvl = 0;
        let robust = this.data.items.filter(element => element.data.data?.reference === "robust");
        if(robust.length > 0){
            let powerLvl = getPowerLevel(robust[0]);
            robustLvl = powerLvl.level;
        }
        let naturalweaponLvl = 0;
        let naturalweapon = this.data.items.filter(element => element.data.data.reference === "naturalweapon");
        if(naturalweapon.length > 0){
            naturalweaponLvl = getPowerLevel(naturalweapon[0]).level;
        }
        let naturalwarriorLvl = 0;
        let naturalwarrior = this.data.items.filter(element => element.data.data.reference === "naturalwarrior");
        if(naturalwarrior.length > 0){
            naturalwarriorLvl = getPowerLevel(naturalwarrior[0]).level;
        }
        let flagBerserk = this.getFlag(game.system.id, 'berserker');
        let colossalLvl = 0;
        let colossal = this.data.items.filter(element => element.data.data?.reference === "colossal");
        if(colossal.length > 0){
            colossalLvl = getPowerLevel(colossal[0]).level;
        }
        let flagDancing = this.getFlag(game.system.id, 'dancingweapon');
        // check for abilities that changes attack attribute
        let dominate = this.data.items.filter(element => element.data.data?.reference === "dominate");
        let feint = this.data.items.filter(element => element.data.data?.reference === "feint");
        let knifeplay = this.data.items.filter(element => element.data.data?.reference === "knifeplay");
        let sixthsense = this.data.items.filter(element => element.data.data?.reference === "sixthsense");
        let tacticianLvl = 0;
        let tactician = this.data.items.filter(element => element.data.data?.reference === "tactician");
        if(tactician.length > 0){
            tacticianLvl = getPowerLevel(tactician[0]).level;
        }
        for(let item of activeWeapons){
            let attribute = item.data.data.attribute;
            let doAlternativeDamage = item.data.data.alternativeDamage !== "none";
            let tooltip = "";
            let baseDamage = item.data.data.baseDamage;
            if( baseDamage === undefined) {
                baseDamage = "1d8";
            }
            let sometimesOnBonusFromAbilities = "";
            let sometimesOnBonusFromAbilitiesShort = "";
            let bonusDamage = "";
            let shortBonusDamage = "";
            let damageFavour = 0;
            if( item.data.data.bonusDamage !== undefined && item.data.data.bonusDamage != ""){
                let plus = "+";
                if(item.data.data.bonusDamage.charAt(0) === '+') {
                    plus = "";
                }
                bonusDamage = plus + item.data.data.bonusDamage;
                shortBonusDamage += plus + item.data.data.bonusDamage;;
            }
            if(tacticianLvl > 2 && item.data.data.reference != "heavy"){
                if(this.data.data.attributes.cunning.total > this.data.data.attributes[attribute].total){
                    attribute = "cunning";
                }
            }
            if(item.data.data?.isMelee){
                if(dominate.length > 0){
                    if(this.data.data.attributes.persuasive.total > this.data.data.attributes[attribute].total){
                        attribute = "persuasive";
                    }
                }
                if(feint.length > 0 && (item.data.data.qualities.precise || item.data.data.qualities.short)){
                    if(this.data.data.attributes.discreet.total > this.data.data.attributes[attribute].total){
                        attribute = "discreet";
                    }
                }
                if(knifeplay.length > 0 && item.data.data.qualities.short){
                    if(this.data.data.attributes.quick.total > this.data.data.attributes[attribute].total){
                        attribute = "quick";
                    }
                }
                if(ironFistLvl > 0){
                    if(this.data.data.attributes.strong.total >= this.data.data.attributes[attribute].total){
                        attribute = "strong";
                    }
                }
                if(flagDancing){
                    let resoluteMod = checkResoluteModifiers(this, "");
                    attribute = resoluteMod.bestAttributeName;
                    tooltip += game.i18n.localize("POWER_LABEL.DANCING_WEAPON") + ", ";
                }
                if(doAlternativeDamage){
                    let alternativeDamageLvl = 0;
                    let alternativeDamage = this.data.items.filter(element => element.data.data.reference === "alternativedamage");
                    if(alternativeDamage.length > 0){
                        alternativeDamageLvl = getPowerLevel(alternativeDamage[0]).level;
                        let newdamage = upgradeDice(baseDamage, alternativeDamageLvl-1);
                        baseDamage = newdamage;
                        tooltip += game.i18n.localize("TRAIT_LABEL.ALTERNATIVEDAMAGE") + ", ";
                    }
                } else{
                    if(polearmmasteryLvl > 0 && item.data.data.qualities.long){
                        let newdamage = upgradeDice(baseDamage, 1);
                        baseDamage = newdamage;
                        tooltip += game.i18n.localize("ABILITY_LABEL.POLEARM_MASTERY") + ", ";
                    }
                    if(shieldfighterLvl > 0){
                        if(["1handed", "short", "unarmed"].includes(item.data.data.reference)){
                            let newdamage = upgradeDice(baseDamage, 1);
                            baseDamage = newdamage;
                            tooltip += game.i18n.localize("ABILITY_LABEL.SHIELD_FIGHTER") + ", ";
                        }
                        else if(item.data.data.reference === "shield"){
                            if(shieldfighterLvl > 2){
                                let newdamage = upgradeDice(baseDamage, 2);
                                baseDamage = newdamage;
                            }
                        }
                    }
                    if(robustLvl == 1){
                        sometimesOnBonusFromAbilities += " +1d4["+game.i18n.localize("TRAIT_LABEL.ROBUST")+"]";
                        sometimesOnBonusFromAbilitiesShort += " +1d4";
                        tooltip += game.i18n.localize("TRAIT_LABEL.ROBUST") + robustLvl.toString() + ", ";
                    }
                    else if(robustLvl == 2){
                        sometimesOnBonusFromAbilities += " +1d6["+game.i18n.localize("TRAIT_LABEL.ROBUST")+"]";
                        sometimesOnBonusFromAbilitiesShort += " +1d6";
                        tooltip += game.i18n.localize("TRAIT_LABEL.ROBUST") + robustLvl.toString() + ", ";
                    }
                    else if(robustLvl > 2){
                        sometimesOnBonusFromAbilities += " +1d8["+game.i18n.localize("TRAIT_LABEL.ROBUST")+"]";
                        sometimesOnBonusFromAbilitiesShort += " +1d8";
                        tooltip += game.i18n.localize("TRAIT_LABEL.ROBUST") + robustLvl.toString() + ", ";
                    }
                    if(flagBerserk){
                        bonusDamage += " +1d6["+game.i18n.localize("ABILITY_LABEL.BERSERKER")+"]";
                        shortBonusDamage += " +1d6";
                        tooltip += game.i18n.localize("ABILITY_LABEL.BERSERKER") + ", ";
                    }
                    if(ironFistLvl > 0){
                        if(this.data.data.attributes.strong.total >= this.data.data.attributes[attribute].total){
                            attribute = "strong";
                            let featSt = this.data.items.filter(item => item.data.data.reference === "featofstrength");
                            if((featSt.length != 0) && (this.data.data.health.toughness.value < (this.data.data.health.toughness.max/2))){
                                if(featSt[0].data.data.master.isActive){
                                    bonusDamage += " +1d4["+game.i18n.localize("ABILITY_LABEL.FEAT_STRENGTH")+"]";
                                    shortBonusDamage += " +1d4";
                                    tooltip += game.i18n.localize("ABILITY_LABEL.FEAT_STRENGTH") + ", ";
                                }
                            }
                        }
                        if(ironFistLvl == 2){
                            sometimesOnBonusFromAbilities += " +1d4["+game.i18n.localize("ABILITY_LABEL.IRON_FIST")+"]";
                            sometimesOnBonusFromAbilitiesShort += " +1d4";
                            tooltip += game.i18n.localize("ABILITY_LABEL.IRON_FIST") + ", ";
                        }
                        else if(ironFistLvl > 2){
                            sometimesOnBonusFromAbilities += " +1d8["+game.i18n.localize("ABILITY_LABEL.IRON_FIST")+"]";
                            sometimesOnBonusFromAbilitiesShort += " +1d8";
                            tooltip += game.i18n.localize("ABILITY_LABEL.IRON_FIST") + ", ";
                        }
                    }
                }
            }
            if(item.data.data?.isDistance){
                if(sixthsense.length > 0){
                    if(this.data.data.attributes.vigilant.total > this.data.data.attributes[attribute].total){
                        attribute = "vigilant";
                    }
                }
                if(!doAlternativeDamage){
                    if(item.data.data.reference === "thrown"){
                        let steelthrow = this.data.items.filter(element => element.data.data.reference === "steelthrow");
                        if(steelthrow.length > 0){
                            let newdamage = upgradeDice(baseDamage, 1);
                            baseDamage = newdamage;
                            tooltip += game.i18n.localize("ABILITY_LABEL.STEEL_THROW") + ", ";
                        }
                    }
                    if(item.data.data.reference === "ranged"){
                        if(marksmanLvl > 0){
                            let newdamage = upgradeDice(baseDamage, 1);
                            baseDamage = newdamage;
                            tooltip += game.i18n.localize("ABILITY_LABEL.MARKSMAN") + ", ";
                        }
                    }
                }
            }
            if(!doAlternativeDamage){
                if(item.data.data.reference === "heavy"){
                    if(twohandedforceLvl > 0){
                        let newdamage = upgradeDice(baseDamage, 1);
                        baseDamage = newdamage;
                        tooltip += game.i18n.localize("ABILITY_LABEL.2HANDED_FORCE") + ", ";
                    }
                }
                if(item.data.data.reference === "unarmed"){
                    if(naturalweaponLvl > 0){
                        let newdamage = upgradeDice(baseDamage, naturalweaponLvl);
                        baseDamage = newdamage;
                        tooltip += game.i18n.localize("TRAIT_LABEL.NATURALWEAPON") + naturalweaponLvl.toString() + ", ";
                    }
                    if(naturalwarriorLvl > 0){
                        let newdamage = upgradeDice(baseDamage, 1);
                        baseDamage = newdamage;
                        tooltip += game.i18n.localize("ABILITY_LABEL.NATURAL_WARRIOR") + naturalwarriorLvl.toString() + ", ";
                    }
                    if(naturalwarriorLvl > 2){
                        bonusDamage += " +1d6["+game.i18n.localize("ABILITY_LABEL.NATURAL_WARRIOR")+"]";
                        shortBonusDamage += " +1d6";
                    }
                }
            }
            let pcDamage = baseDamage + bonusDamage;
            let pcShort = baseDamage + shortBonusDamage;
            let pcDamageExt = pcDamage + sometimesOnBonusFromAbilities;
            let pcExtShort = pcShort + sometimesOnBonusFromAbilitiesShort;
            let DmgRoll= new Roll(pcDamage).evaluate({maximize: true});
            let npcDamage = Math.ceil(DmgRoll.total/2);
            let baseDmgRoll = new Roll(baseDamage).evaluate({maximize: true});
            let DmgRollExt= new Roll(pcDamageExt).evaluate({maximize: true});
            let npcDamageExt = Math.ceil(DmgRollExt.total/2);
            if(item.data.data.qualities?.massive || (colossalLvl && !doAlternativeDamage)) {
                pcDamage = "2d"+(baseDmgRoll.total)+"kh"+bonusDamage;
                pcShort = "2d"+(baseDmgRoll.total)+"kh"+shortBonusDamage;
                pcDamageExt = pcDamage + sometimesOnBonusFromAbilities;
                pcExtShort = pcShort + sometimesOnBonusFromAbilitiesShort;
                damageFavour = 1;
                if(colossalLvl) tooltip += game.i18n.localize("TRAIT_LABEL.COLOSSAL") + ", ";
            }
            if(item.data.data.qualities?.deepImpact){
                pcDamage += "+1d1["+game.i18n.localize("QUALITY.DEEPIMPACT")+"]";
                pcShort += " +1";
                pcDamageExt += "+1d1["+game.i18n.localize("QUALITY.DEEPIMPACT")+"]";
                pcExtShort += "+1"
                npcDamage+=1;
                npcDamageExt+=1;
                tooltip += game.i18n.localize("QUALITY.DEEPIMPACT") + ", ";
            }
            let attributeMod = 0;
            if(item.data.data.qualities.precise) {
                attributeMod = 1;
            }
            let itemID = item.id;
            weaponArray.push({
                id: itemID,
                sort: item.data.sort,
                name : item.data.name,
                img: item.data.img,
                attribute: attribute,
                attributeLabel: this.data.data.attributes[attribute].label, 
                attributeValue: this.data.data.attributes[attribute].total + attributeMod,
                attributeMod: (10 - attributeMod - this.data.data.attributes[attribute].total),
                tooltip : tooltip,
                isActive: item.data.isActive,
                isEquipped: item.data.isEquipped,
                reference: item.data.data.reference, 
                isMelee: item.data.data.isMelee, 
                isDistance: item.data.data.isDistance,
                doAlternativeDamage: doAlternativeDamage,
                qualities: item.data.data.qualities,
                damage: {
                    base: baseDamage, 
                    bonus: bonusDamage,
                    sometimesOnBonusFromAbilitiesShort: sometimesOnBonusFromAbilitiesShort,
                    sometimesOnBonusFromAbilities: sometimesOnBonusFromAbilities,
                    pc: pcDamage, 
                    pcShort: pcShort,
                    pcExtended: pcDamageExt,
                    pcExtShort: pcExtShort,
                    npcExtended: npcDamageExt,
                    npc: npcDamage,
                    damageFavour: damageFavour,
                    alternativeDamageAttribute: item.data.data.alternativeDamage
                }
            })
        }
        return(weaponArray)
    }
    
    _evaluateProtection(item, extraArmorBonus) {
        // console.log("_evaluateProtection ");

        let tooltip = "";
        let protection = item.data.data.baseProtection;
        if( protection === undefined) {
            protection = "0";
        }
        let impeding = item.data.data.impeding;
        let impedingMov=impeding;
        let impedingMagic=impeding;
        let bonusProtection = "";
        if(item.data.data.bonusProtection !== undefined && item.data.data.bonusProtection != ""){
            let plus = "+";
            if(item.data.data.bonusProtection.charAt(0) === '+' ) { 
                plus = "";
            }
            bonusProtection = plus + item.data.data.bonusProtection;
        }
        if(protection != "0" || bonusProtection == "")
        {
            let armoredmystic = this.items.filter(element => element.data.data?.reference === "armoredmystic");
            if(armoredmystic.length > 0){
                let powerLvl = getPowerLevel(armoredmystic[0]);
                if(powerLvl.level>0 && ["1d4", "1d6"].includes(protection)){
                    impedingMagic = 0;
                }
                if(powerLvl.level>1 && protection === "1d8"){
                    impedingMagic = 0;
                }
                if(powerLvl.level>2){
                    bonusProtection += "+1d4";
                    tooltip += game.i18n.localize("ABILITY_LABEL.ARMORED_MYSTIC") + ", ";
                }
            }
            let manatarms = this.items.filter(element => element.data.data?.reference === "manatarms");
            if(manatarms.length > 0){
                let powerLvl = getPowerLevel(manatarms[0]);
                let newprot = upgradeDice(protection, 1);
                protection = newprot;
                tooltip += game.i18n.localize("ABILITY_LABEL.MAN-AT-ARMS") + ", ";
                if(powerLvl.level > 1){
                    impedingMov = 0;
                }
            }
            let naturalarmor = this.items.filter(element => element.data.data?.reference === "armored");
            if(naturalarmor.length > 0){
                let powerLvl = getPowerLevel(naturalarmor[0]);
                let newprot = upgradeDice(protection, powerLvl.level -1);
                protection = newprot;
                tooltip += game.i18n.localize("TRAIT_LABEL.ARMORED") + " (" + powerLvl.lvlName + "), ";
            }
            let robust = this.items.filter(element => element.data.data?.reference === "robust");
            if(robust.length > 0){
                let powerLvl = getPowerLevel(robust[0]);
                if(powerLvl.level == 2){
                    bonusProtection += "+1d6";
                }
                else if(powerLvl.level > 2){
                    bonusProtection += "+1d8";
                }
                else{
                    bonusProtection += "+1d4";
                }
                tooltip += game.i18n.localize("TRAIT_LABEL.ROBUST") + " (" + powerLvl.lvlName + "), ";
            }
            let survivalinstinct = this.items.filter(element => element.data.data?.reference === "survivalinstinct");
            if(survivalinstinct.length > 0){
                let powerLvl = getPowerLevel(survivalinstinct[0]);
                if(powerLvl.level > 1){
                    bonusProtection += "+1d4";
                    tooltip += game.i18n.localize("TRAIT_LABEL.SURVIVALINSTINCT") + " (" + powerLvl.lvlName + "), ";
                }
            }
            let flagBerserk = this.getFlag(game.system.id, 'berserker');
            if(flagBerserk && flagBerserk > 1){
                bonusProtection += "+1d4";
                tooltip += game.i18n.localize("ABILITY_LABEL.BERSERKER") + ", ";
            }
            if (extraArmorBonus != ""){ bonusProtection += "+" + extraArmorBonus}
        }
        let pcProt = "";
        let armorRoll= null;
        let unfavourPcProt = "0";
        if( protection === "0" && bonusProtection === "") {
            armorRoll = new Roll("0").evaluate({maximize: true});    
        } else if(protection === "0") {
            pcProt = bonusProtection;
            unfavourPcProt = bonusProtection;
            armorRoll = new Roll(pcProt).evaluate({maximize: true});    
        } else {
            pcProt = protection + bonusProtection;
            armorRoll = new Roll(pcProt).evaluate({maximize: true});
            let maxBaseArmor = new Roll(protection).evaluate({maximize: true});
            unfavourPcProt = "2d"+(maxBaseArmor.total)+"kl"+bonusProtection;
        }

        let npcProt = Math.ceil(armorRoll.total/2);
        if(item.data.data?.qualities?.reinforced){
            pcProt += "+1";
            npcProt+= 1;
            unfavourPcProt += "+1";
        }
        return( {
            _id: item.id,
            id: item.id,
            name: item.name,
            base: protection,
            bonus: bonusProtection, 
            pc: pcProt, 
            npc: npcProt,
            unfavourPcProt: unfavourPcProt,
            tooltip: tooltip,
            impeding: impeding,
            impedingMov: impedingMov,
            impedingMagic: impedingMagic,
            isActive: item.data.isActive,
            isEquipped: item.data.isEquipped, 
            img: item.img} );
    }

    _getDefenseValue(data, activeArmor){
        let attributeDef = "quick";
        let attDefValue = data.data.attributes[attributeDef].total;
        let sixthsense = this.data.items.filter(element => element.data.data?.reference === "sixthsense");
        if(sixthsense.length > 0){
            let sixthsenseLvl = getPowerLevel(sixthsense[0]).level;
            if(sixthsenseLvl >1 && data.data.attributes.vigilant.total > data.data.attributes[attributeDef].total){
                attributeDef = "vigilant";
                attDefValue = data.data.attributes[attributeDef].total
            }
        }
        let tactician = this.data.items.filter(element => element.data.data?.reference === "tactician");
        if(tactician.length > 0){
            let tacticianLvl = getPowerLevel(tactician[0]).level;
            if(tacticianLvl >1 && data.data.attributes.cunning.total > data.data.attributes[attributeDef].total){
                attributeDef = "cunning";
                attDefValue = data.data.attributes[attributeDef].total
            }
        }
        let feint = this.data.items.filter(element => element.data.data?.reference === "feint");
        if(feint.length > 0){
            let feintLvl = getPowerLevel(feint[0]).level;
            if(feintLvl >1 && data.data.attributes.discreet.total > data.data.attributes[attributeDef].total){
                attributeDef = "discreet";
                attDefValue = data.data.attributes[attributeDef].total
            }
        }

        let flagDancing = this.getFlag(game.system.id, 'dancingweapon');
        if(flagDancing){
            let resoluteMod = checkResoluteModifiers(this, "");
            attributeDef = resoluteMod.bestAttributeName;
            attDefValue = data.data.attributes[attributeDef].total;
        }

        data.data.defense.attribute = attributeDef;
        data.data.defense.attributelabel = data.data.attributes[attributeDef].label;

        let defMsg = `${game.i18n.localize(data.data.attributes[attributeDef].label)} ${data.data.attributes[attributeDef].total}`;
        let flagBerserk = this.getFlag(game.system.id, 'berserker');
        if(flagBerserk && flagBerserk < 3){
            attDefValue = 5;
            defMsg = `${game.i18n.localize("ABILITY_LABEL.BERSERKER")} 5`;
        }
        defMsg += `<br/>${game.i18n.localize("ARMOR.IMPEDINGLONG")}(${-1 * activeArmor.impedingMov})<br/>${data.data.bonus.defense_msg}`;
        let robust = this.data.items.filter(element => element.data.data?.reference === "robust");
        if(robust.length > 0){
            let powerLvl = getPowerLevel(robust[0]);
            attDefValue -=  powerLvl.level + 1;
            defMsg += `<br/>${game.i18n.localize("TRAIT_LABEL.ROBUST")}(${-1 * (powerLvl.level + 1)})`;
        }

        let shieldfighter = this.data.items.filter(element => element.data.data?.reference === "shieldfighter");
        if(shieldfighter.length > 0){
            let haveShieldEquipped = this.data.items.filter(element => element.data.data?.reference === "shield" && element.data.isActive)
            if(haveShieldEquipped.length > 0){
                attDefValue += 1
                defMsg += `<br/>${game.i18n.localize("ABILITY_LABEL.SHIELD_FIGHTER")}(+1)`;
            }
        }
        let stafffighting = this.data.items.filter(element => element.data.data?.reference === "stafffighting");
        if(stafffighting.length > 0){
            let haveLongEquipped = this.data.items.filter(element => element.data.isWeapon && element.data.data.qualities.long && element.data.isActive)
            if(haveLongEquipped.length > 0){
                attDefValue += 1
                defMsg += `<br/>${game.i18n.localize("ABILITY_LABEL.STAFF_FIGHTING")}(+1)`;
            }
        }
        return({
            attribute: attributeDef,
            attDefValue: attDefValue,
            defMsg: defMsg
        })
    }

    _getDamageProtection(){
        let damageProt = {
            normal: 1,
            elementary: 1,
            mystic: 1,
            holy: 1,
            mysticalWeapon: 1
        }
        let undead = this.data.items.filter(element => element.data.data?.reference === "undead");
        if(undead.length > 0){
            let undeadLvl = getPowerLevel(undead[0]).level;
            if(undeadLvl >1){
                damageProt.normal = 0.5;
                damageProt.elementary = 0.5;
            }
            if(undeadLvl >2){
                damageProt.mystic = 0.5;
            }
        }
        let spiritform = this.data.items.filter(element => element.data.data?.reference === "spiritform");
        if(spiritform.length > 0){
            let spiritformLvl = getPowerLevel(spiritform[0]).level;
            if(spiritformLvl >0){
                damageProt.normal = 0.5;
            }
            if(spiritformLvl >1){
                damageProt.mystic = 0.5;
                damageProt.elementary = 0.5;
                damageProt.holy = 0.5;
                damageProt.mysticalWeapon = 0.5
            }
            if(spiritformLvl >2){
                damageProt.normal = 0;
            }
        }
        let swarm = this.data.items.filter(element => element.data.data?.reference === "swarm");
        if(swarm.length > 0){
            let swarmLvl = getPowerLevel(swarm[0]).level;
            if(swarmLvl >0){
                damageProt.normal = 0.5;
                damageProt.mystic = 0.5;
                damageProt.elementary = 0.5;
                damageProt.holy = 0.5;
                damageProt.mysticalWeapon = 0.5
            }
            if(swarmLvl >2){
                damageProt.normal = 0.25;
                damageProt.mystic = 0.25;
                damageProt.elementary = 0.25;
                damageProt.holy = 0.25;
                damageProt.mysticalWeapon = 0.25
            }
        }
        let colossal = this.data.items.filter(element => element.data.data?.reference === "colossal");
        if(colossal.length > 0 && colossal[0].data.data.master.isActive){
            damageProt.normal = 0;
        }
        return(damageProt)
    }

    //get all bonus armors (blessed shield, ect)
    _getExtraArmorBonuses() {
        let extraArmorBonus = "";
        let armorList = this.data.items.filter(element => element.data.isArmor);
        for(let armor of armorList){
            if(armor.data.data.baseProtection == "0" && armor.data.data.bonusProtection != "" && armor.data.isActive){
                if(extraArmorBonus != ""){extraArmorBonus += "+"};
                extraArmorBonus += armor.data.data.bonusProtection //+ "["+ armor.data.name +"]"
            }
        }
        return(extraArmorBonus)
    }

    _getActiveArmor(data, extraArmorBonus) {
        let wearArmor;
        data.data.armors = [];
        let armorList = this.data.items.filter(element => element.data.isArmor);
        armorList = Array.from(armorList.values()).sort( (a, b) => {
            if(a.data.type == b.data.type) {
                return a.data.name == b.data.name ? 0 : a.data.name < b.data.name ? -1:1;
            } else {                
                return  (game.symbaroum.config.itemSortOrder.indexOf(a.data.type) - game.symbaroum.config.itemSortOrder.indexOf(b.data.type));
            }
        });
        // for( const [key, armor] of this.data.items.entries() ) {
        for(let armor of armorList){

            let armorData = this._evaluateProtection(armor, extraArmorBonus);
            data.data.armors.push(armorData);
            if(armorData.isActive && (armor.data.data.baseProtection != "0" || armor.data.data.bonusProtection == "")){
                wearArmor = armorData;
            }
        }
        if(typeof wearArmor == 'undefined'){
            let noArmor = this._evaluateProtection({
                    id: null,
                    name: "No Armor",
                    img:"icons/equipment/chest/shirt-simple-white.webp",
                    data: {
                        data: {
                            baseProtection: "0",
                            bonusProtection: "",
                            impeding: 0,
                            qualities: {
                                flexible: false,
                                cumbersome: false,
                                concealed: false,
                                reinforced: false,
                                hallowed: false,
                                retributive: false,
                                desecrated: false
                            
                            }
                        },
                        type:"armor",
                        isArmor: true,
                        isActive: true, 
                        isEquipped: false
                    }                    
                }, extraArmorBonus);
            noArmor.isNoArmor = true;
            data.data.armors.push(noArmor);
            wearArmor = noArmor;
        }
        return(wearArmor)
    }

    _getInitiativeAttribute() {
        let attributeInit = "quick";
        let sixthsenseLvl = 0;
        let sixthsense = this.data.items.filter(element => element.data.data?.reference === "sixthsense");
        if(sixthsense.length > 0){
            sixthsenseLvl = getPowerLevel(sixthsense[0]).level;
            if(sixthsenseLvl > 1){
                if(this.data.data.attributes.vigilant.total > this.data.data.attributes[attributeInit].total){
                    attributeInit = "vigilant";
                }
            }
        }
        let tactician = this.data.items.filter(element => element.data.data?.reference === "tactician");
        if(tactician.length > 0){
            if(this.data.data.attributes.cunning.total > this.data.data.attributes[attributeInit].total){
                attributeInit = "cunning";
            }
        }
        this.data.data.initiative.attribute = attributeInit;
    }
    _getWeapons(data) {
        let weaponArray = this.data.items.filter(element => element.data.isWeapon);
        weaponArray = Array.from(weaponArray.values()).sort( (a, b) => {
            if(a.data.type == b.data.type) {
                return a.data.name == b.data.name ? 0 : a.data.name < b.data.name ? -1:1;
            } else {                
                return  (game.symbaroum.config.itemSortOrder.indexOf(a.data.type) - game.symbaroum.config.itemSortOrder.indexOf(b.data.type));
            }
        });
        
        return(weaponArray)
    }

    _addBonusData(currentb, item, itemb, bonusType) {
      if(itemb[bonusType] != 0 ) {
        currentb[bonusType] += itemb[bonusType];
        currentb[bonusType+"_msg"] += "<br />"+item.name+"("+itemb[bonusType]+")";
      }
    }

    _addBonus(data, item) {

      let currentBonus = data.data.bonus;
      let currentBonusToughness = currentBonus.toughness;
      let currentBonusCorruption = currentBonus.corruption;
      let currentBonusExperience = currentBonus.experience;
      let itemBonus = item.data.bonus;
      let itemBonusToughness = itemBonus.toughness;
      let itemtBonusCorruption = itemBonus.corruption;
      let itemBonusExperience = itemBonus.experience;
      
      this._addBonusData(currentBonus, item, itemBonus, "defense");
      this._addBonusData(currentBonus, item, itemBonus, "accurate");
      this._addBonusData(currentBonus, item, itemBonus, "cunning");
      this._addBonusData(currentBonus, item, itemBonus, "discreet");
      this._addBonusData(currentBonus, item, itemBonus, "persuasive");
      this._addBonusData(currentBonus, item, itemBonus, "quick");
      this._addBonusData(currentBonus, item, itemBonus, "resolute");
      this._addBonusData(currentBonus, item, itemBonus, "strong");
      this._addBonusData(currentBonus, item, itemBonus, "vigilant");
      
      this._addBonusData(currentBonusToughness, item, itemBonusToughness, "max");
      this._addBonusData(currentBonusToughness, item, itemBonusToughness, "threshold");
      this._addBonusData(currentBonusCorruption, item, itemtBonusCorruption, "max");
      this._addBonusData(currentBonusCorruption, item, itemtBonusCorruption, "threshold");
      this._addBonusData(currentBonusExperience, item, itemBonusExperience, "cost");
      this._addBonusData(currentBonusExperience, item, itemBonusExperience, "value");

    }

    async usePower(ability){
        if(ability.data.data?.script) ability.data.data?.script(ability, this);
    }

    async rollArmor() {
        if(!game.settings.get('symbaroum', 'combatAutomation')){
            const armor = this.data.data.combat;
            await prepareRollAttribute(this, "defense", armor, null)
        }
    }

    async rollWeapon(weapon){
        if(game.settings.get('symbaroum', 'combatAutomation')){
            await attackRoll(weapon, this);
        }
        else{
            await prepareRollAttribute(this, weapon.attribute, null, weapon)
        }
    }

    async rollAttribute(attributeName) {
        await prepareRollAttribute(this, attributeName, null, null);
    }

}
