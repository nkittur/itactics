import random
from random import randrange

class NameGenerator():

	def line_appender(self, file_path, target):
		file = open(file_path, "r", encoding = "ISO-8859-1")
		splitfile = file.read().splitlines()
		for line in splitfile:
			target.append(line)

	def name_selector(self, target_list):
		selected = target_list[randrange(len(target_list))]
		return selected

	def name_builder(self, first_name_list_path, last_name_list_path):
		first_name_list = []
		last_name_list = []

		self.line_appender(first_name_list_path, first_name_list)
		self.line_appender(last_name_list_path, last_name_list)

		first_name_selected = self.name_selector(first_name_list)
		last_name_selected = self.name_selector(last_name_list)

		name = first_name_selected+" "+last_name_selected
		return name

	def generate(self):
		if (random.choice([True, False])):
		#if True:
			name = self.name_builder("first_name_male.txt", "last_name.txt")
		else:
			name = self.name_builder("first_name_female.txt", "last_name.txt")
		return name


	# while running:

	# 	if first_time:
	# 		print(welcome_message)

	# 	user_input = input(male_or_female_message)

	# 	if user_input == "M" or user_input == "m":

	# 		name = name_builder("first_name_male.txt", "last_name.txt")
	# 		print(name)
	# 		first_time = False

	# 	elif user_input == "F" or user_input == "f":
	# 		name = name_builder("first_name_female.txt", "last_name.txt")
	# 		print(name)
	# 		first_time = False

	# 	else:
	# 		print("please specify gender")
			# first_time = False