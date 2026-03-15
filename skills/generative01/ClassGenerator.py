import random, logging
from random import randrange

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)


class ClassGenerator():




	# def line_appender(self, file_path, target):
	# 	file = open(file_path, "r", encoding = "ISO-8859-1")
	# 	splitfile = file.read().splitlines()
	# 	for line in splitfile:
	# 		target.append(line)

	# def name_selector(self, target_list):
	# 	selected = target_list[randrange(len(target_list))]
	# 	return selected

	# def name_builder(self, first_name_list_path, last_name_list_path):
	# 	first_name_list = []
	# 	last_name_list = []

	# 	self.line_appender(first_name_list_path, first_name_list)
	# 	self.line_appender(last_name_list_path, last_name_list)

	# 	first_name_selected = self.name_selector(first_name_list)
	# 	last_name_selected = self.name_selector(last_name_list)

	# 	name = first_name_selected+" "+last_name_selected
	# 	return name

	def generateActive(self, skillPowerLevel):

		# if (random.choice([True, False])):
		# 	name = self.name_builder("first_name_male.txt", "last_name.txt")
		# else:
		# 	name = self.name_builder("first_name_female.txt", "last_name.txt")
		# return name


		# Active skills have a target/range, a multiplier for a skill (or multiple), an effect,
		# a cooldown (optional), a cost (potentially negative), 
		# an effect (physical damage, magical damage, piercing damage, healing, regen, debuff, buff)
		# possible chaining or other triggering of other stuff

		logging.debug('in generateActive')


		# name, likelihood weight, cost weight, range if any, any modifiers
		skillComponentTarget = [
			('self',20,0),
			('ally',20,0),
			('enemy',80,0),
			('any',20,2),
			]


		skillComponentAction = [
			('attack',60,0),
			('heal',20,6),
			('buff',20,4),
			('debuff',20,3),
			]

		skillComponentAttackType = [
			('melee',40,0),
			('magic',30,3),
			('missile',30,2),
			]

		skillComponentArea = [
			('single', 100, 0, {'range',0}),
			('circle', 30, 3, {'range',1}),
			('circle', 10, 5, {'range',2}),
			('circle', 5, 8, {'range',3}),
			('beam', 20, 2,  {'range',2}),
			('beam', 10, 3,  {'range',3}),
			('beam', 5, 6,  {'range',20}),
			('battlefield',2,12, {'range',1000}),
			]

		skillComponentCooldown = [
			(0, 30, 6),
			(1, 50, 3),
			(2, 20, 0),
			]

		# Range is generated in a separate function



		skill = {}
		skill['type'] = 'active'
		skill['target'] = self.chooseWeighted(skillComponentTarget)
		skill['action'] = self.chooseWeighted(skillComponentAction)

		# Don't choose a self-attack
		while skill['target'][0] == 'self' and skill['action'][0] == 'attack':
			skill['target'] = self.chooseWeighted(skillComponentTarget)
			skill['action'] = self.chooseWeighted(skillComponentAction)


		# Reduce likelihood of enemy heal/buff and ally attack/debuff as main
		while skill['target'][0] == 'ally' and (skill['action'][0] == 'attack' or skill['action'][0] == 'debuff'):
			if random.randint(1,10) < 3: 
				logging.debug('Let bad ally targeting skill go')
				break
			else:
				logging.debug('Reroll bad ally targeting skill')
				skill['target'] = self.chooseWeighted(skillComponentTarget)
				skill['action'] = self.chooseWeighted(skillComponentAction)			


		#logging.debug('%s',skill)

		while skill['target'][0] == 'enemy' and (skill['action'][0] == 'heal' or skill['action'][0] == 'buff'):
			if random.randint(1,10) < 3: 
				logging.debug('Let bad enemy targeting skill go')
				break
			else:
				logging.debug('Reroll bad enemy targeting skill')
				skill['target'] = self.chooseWeighted(skillComponentTarget)
				skill['action'] = self.chooseWeighted(skillComponentAction)		


		skill['area'] = self.chooseWeighted(skillComponentArea)

		if skill['target'][0] == 'self':
			# skill['attackType'] = ('none',0,0.5)
			skill['range'] = 0
		else:
			skill['attackType'] = self.chooseWeighted(skillComponentAttackType)
			skill['range'] = self.generateRange(skill['attackType'][0])

		skill['cooldown'] = self.chooseWeighted(skillComponentCooldown)

		#compute total cost of skill
		cost = 0
		for component in skill:
			logging.debug('Component: %s, Value: %s', component, skill[component])
			if isinstance(skill[component],tuple):
				logging.debug('getting cost which is %s', component[2])
				cost = cost + float(skill[component][2])

		#logging.debug('%s', skill)
		logging.debug('total cost is %d', cost)

		return skill

	def generateRange(self, attackType='melee'):

		logging.debug('in generateRange')
		if attackType == 'melee':
			# range, likelihood weight, cost weight
			rangeCost = [(1,50,0), (2,20,3), (3,5,5), (10,1,10)]
		elif attackType == 'magic':
			rangeCost = [(1,30,0), (2,30,1), (3,20,2), (5,10,3), (8,5,5), (100,1,10)]
		elif attackType == 'missile':
			rangeCost = [(3,10,0), (5,40,1), (6,20,1.5), (7,10,2), (8,5,3), (100,1,5)]

		return self.chooseWeighted(rangeCost)

	def chooseWeighted(self, optionTuples):
		# Tuples need to have the 2nd element be the weight
		# This function then normalizes all those weights and chooses one accordingly

		normalize = 0
		for option in optionTuples:
			normalize = normalize + option[1]
		choiceIndex = random.randint(1,normalize)
		# print("Choosing " + str(choiceIndex))
		# print("From" + str(optionTuples))

		for option in optionTuples:
			choiceIndex = choiceIndex - option[1]
			if choiceIndex < 1:
				break

		return option

	def generatePassive(self, skillPowerLevel):

		
		skillComponentTrigger = [
			'whenever',
			'first_time_this_round',
			'first_time_this_battle',
			]

		skillComponentState = [
			('damaged', 'action'),
			('healed', 'action'),
			('full_health', 'state'),
			('not_full_health', 'state'),
			]

		skillComponentEffect = [
			'damage',
			'health',
			'attack_power',
			'magic_power',
			'num_attacks',
			'movement',
			'armor',
			'defense',
			'dodge',
			'crit chance',
			'crit damage',
			'regen',
			]

		skillComponentValence = [
			'increase',
			'decrease',
			'double',
			'halve',
			]

			# eventually also
			# 'remove_buff',
			# 'remove_debuff',
			# 'add_buff'
			# 'add_debuff'


		skillComponentDuration = [
			'1_turn',
			'2_turns',
			'3_turns',
			'next_attack',
			'next_action',
			'this_battle',
			]
			# 'forever',

		skill = {}
		skill['type'] = 'passive'
		skill['trigger'] = random.choice(skillComponentTrigger)
		skill['state'] = random.choice(skillComponentState)
		skill['valence'] = random.choice(skillComponentValence)
		skill['effect'] = random.choice(skillComponentEffect)
		skill['duration'] = random.choice(skillComponentDuration)
		#print(skill)
		#logging.debug('%s', skill)
		#return ('a skill with power level '+str(skillPowerLevel))

		return skill


	def generateClass(self, maxPowerLevel):
		# test run where we generate a passive skill that gives +3 to damage on all attacks this battle to all allies
		# and a skill where we can do 3 attacks at half damage each

		self.skills = []
		self.remainingPowerLevel = maxPowerLevel

		# Always create a set number of skills for a class including a counter, an active, and a passive
		# Split up power level so that there is never more than half given to one of the core skills and never less than 20%
		skillPowerLevelPercent = random.uniform(0.2, 0.5)
		skillPowerLevel = int(self.remainingPowerLevel * skillPowerLevelPercent)
		passive = self.generatePassive(skillPowerLevel)
		#logging.debug('Passive skill generated: %s', passive)
		self.skills.append(passive)
		self.remainingPowerLevel = self.remainingPowerLevel - skillPowerLevel

		self.skills.append(self.generateActive(skillPowerLevel))

		#logging.debug('All skills: %s', self.skills)

		# while self.remainingPowerLevel > 0:


if __name__ == "__main__":
   # For testing
   cg = ClassGenerator()
   cg.generateClass(20)
   for skill in cg.skills:
   	logging.debug('Skill in cg.skills %s', skill)
   	if skill['type'] == 'active':
   		for item in skill:
   			print(skill[item][0])
