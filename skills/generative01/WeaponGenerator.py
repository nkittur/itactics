import random, logging
from random import randrange

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)


class Weapon():
	def __init__(self, powerLevel = 10):
		super().__init__()
		self.type = ()
		self.mods = []
		self.powerLevel = powerLevel
		self.powerLevelAvailForGen = powerLevel
		self.attackPower = 0

		self.generateWeapon()

	def logWeapon(self):
		logging.debug('Weapon type: {}\n power level {}\n power level remaining {}\n attack power {}'.format(self.type[0], self.powerLevel, self.powerLevelAvailForGen, self.attackPower))
		logging.debug('Mods: {}'.format([x[0] for x in self.mods]))

	def generateWeapon(self):

		# Active skills have a target/range, a multiplier for a skill (or multiple), an effect,
		# a cooldown (optional), a cost (potentially negative), 
		# an effect (physical damage, magical damage, piercing damage, healing, regen, debuff, buff)
		# possible chaining or other triggering of other stuff

		# Weapons have a Weapon Power, base stat(s) that multiply it, and a range
		# They can also have other effects, like +1 fire damage on hit, etc.

		logging.debug('in generateActive')

		# name, likelihood weight, cost weight, range min, range max, stats used, characteristics
		# Consider setting the costs for the base weapon as a multiplier rather than an additive
		weaponType = [
			('Sword',  20, 0, 1, 1, ('str'), ('edged','metal','1hand')),
			('Dagger', 30, 0, 1, 1, ('str','dex'), ('edged','metal','small','1hand','weak')),
			('Spear',  10, 2, 1, 2, ('str'), ('pointed','metal','2hand')),
			('Staff',  10, 0, 1, 1, ('int'), ('2hand')),
			('Bow',    10, 3, 3, 5, ('dex'), ('2hand')),
			]

		# maxMods = [
		# 	(0, 50, 0,),
		# 	(1, 20, 0,),
		# 	(2, 10, 0,),
		# 	(3, 1, 0,),
		# 	]


		self.type = self.chooseWeighted(weaponType)
		self.powerLevelAvailForGen -= self.type[2]

		# self.maxMods = self.chooseWeighted(maxMods)
		# self.powerLevelAvailForGen -= self.maxMods[2]  # eventually replace this with a function that updates powerlevel based on a tuple to avoid errors, maybe in chooseweighted function

		if self.powerLevelAvailForGen > 0:
			self.addAttackPower() # make sure it has at least a minimum attack power

		# for mod in range(self.maxMods[0]):
		# 	# logging.debug('Power level available is {}; adding a mod'.format(self.powerLevelAvailForGen))
		# 	self.addMod()

		while self.powerLevelAvailForGen > 0:
			# logging.debug('Power level available is {}; adding attack power'.format(self.powerLevelAvailForGen))
			if random.randint(1,10) <= 2:
				self.addMod()
			else:
				self.addAttackPower()

		logging.debug('Power level was {} and now is {}'.format(self.powerLevel, self.powerLevelAvailForGen))


	def addAttackPower(self):
		self.attackPower += 1
		self.powerLevelAvailForGen -= 1

	def addMod(self):
		weaponMods = [
			('1_pdam_onhit', 20, 1, {'onhit': ('pdamage', 1)}),
			('2_pdam_onhit', 10, 2, {'onhit', ('pdamage', 2)}),
			('stun', 5, 4, {'onhit': ('stun', .50, 1)}),
			('summon_bunny', 1, 3, {'onhit': ('summon', .25, 'bunny')}),
			]

		# run only if at least one item in the list that is at or lower than the cost of the max avail power
		if self.hasCostMatchingAvail(weaponMods):
			mod = self.chooseWeighted(weaponMods)
			# logging.debug('Mod is: {}'.format(mod))
			while mod[2] > self.powerLevelAvailForGen:
				mod = self.chooseWeighted(weaponMods)

			self.mods.append(mod)
			self.powerLevelAvailForGen -= mod[2]
			# logging.debug('Added mod {}, power level available down to {}'.format(mod, self.powerLevelAvailForGen))

	def hasCostMatchingAvail(self, optionTuples):
		viable = False
		for option in optionTuples:
			if option[2] <= self.powerLevelAvailForGen:
				viable = True
				break
		return viable


	def chooseWeighted(self, optionTuples):
		# Tuples need to have the 2nd element be the weight
		# This function then normalizes all those weights and chooses one accordingly

		normalize = 0
		for option in optionTuples:
			# logging.debug('choose:option: {}'.format(option))
			normalize = normalize + option[1]
		choiceIndex = random.randint(1,normalize)
		# print("Choosing " + str(choiceIndex))
		# print("From" + str(optionTuples))

		for option in optionTuples:
			choiceIndex = choiceIndex - option[1]
			if choiceIndex < 1:
				break

		return option



if __name__ == "__main__":
   # For testing
   w = Weapon(20)

   # logging.debug('Weapon generated! \n {}', wg)
   w.logWeapon()
