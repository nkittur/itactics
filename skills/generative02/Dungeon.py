import random, logging
from random import randrange
from PyQt5 import QtWidgets as qtw
from PyQt5 import QtGui as qtg
from PyQt5 import QtCore as qtc
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QAction, QTableWidget,QTableWidgetItem,QVBoxLayout
from PyQt5.QtCore import pyqtSlot

import Town

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)


class DungeonWindow(qtw.QWidget):
	def __init__(self, parent, powerLevel = 10):
		super().__init__()

		self.powerLevel = powerLevel
		self.parent = parent

		self.initUI()

		logging.debug(self.parent.party)

	def initUI(self):
		self.resize(1024,768)
		self.setWindowTitle('Neverending Fantasy Manager: Dungeon')

		self.layout = qtw.QVBoxLayout()

		self.battlefieldRows = 3
		self.battlefieldColumns = 2
		self.initFields()

		logging.debug('Party: ' + str(self.parent.party))
		self.partyPositions()

		self.hireButton = qtw.QPushButton('Fight!', clicked=self.onBattle)
		self.hireButton.setFixedSize(80,50)

		self.layout.addWidget(self.hireButton)
		self.layout.setAlignment(qtc.Qt.AlignTop)
		self.layout.addStretch()

		self.setLayout(self.layout)

		self.show()


	def initFields(self):
		
		# Battlefields for party and enemies

		layout = qtw.QHBoxLayout()

		self.partyField = QTableWidget()
		self.partyField.setRowCount(self.battlefieldRows)
		self.partyField.setColumnCount(self.battlefieldColumns)

		n = 1
		for x in range(self.battlefieldRows):
			for y in range(self.battlefieldColumns):
				self.partyField.setItem(x,y,QTableWidgetItem(str(n)))
				n += 1

		# self.partyField.setFixedSize(200,100)

		layout.addWidget(self.partyField)

		self.enemyField = QTableWidget()
		self.enemyField.setRowCount(self.battlefieldRows)
		self.enemyField.setColumnCount(self.battlefieldColumns)

		n = 1
		for x in range(self.battlefieldRows):
			for y in range(self.battlefieldColumns):
				self.enemyField.setItem(x,y,QTableWidgetItem(str(n)))
				n += 1

		# self.enemyField.setFixedSize(200,100)

		layout.addWidget(self.enemyField)

		self.layout.addLayout(layout)


	def partyPositions(self):
		x = 1
		for playerId in self.parent.party:
			logging.debug('PlayerID: ' + str(playerId) + '  Name' + self.parent.party[playerId].name)

			player = self.parent.party[playerId]
			playerRow = qtw.QHBoxLayout()

			playerPosition = qtw.QLineEdit()
			playerPosition.setMaxLength(1)
			playerPosition.setFixedWidth(20)
			playerPosition.setText(str(x))

			playerName = qtw.QLabel()
			playerName.setText(player.name)
			playerName.setFixedSize(200,20)
			
			playerRow.addWidget(playerPosition)
			playerRow.addWidget(playerName)
			playerRow.setAlignment(qtc.Qt.AlignLeft)
			#playerRow.addStretch()
			self.layout.addLayout(playerRow)
			x += 1


	@pyqtSlot()
	def onBattle(self):
		print('made it')