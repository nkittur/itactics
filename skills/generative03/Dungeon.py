import random, logging
from random import randrange
from PyQt5 import QtWidgets as qtw
from PyQt5 import QtGui as qtg
from PyQt5 import QtCore as qtc
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QAction, QTableWidget,QTableWidgetItem,QVBoxLayout
from PyQt5.QtCore import pyqtSlot

import Town, Player, Game

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)


class DungeonWindow(qtw.QWidget):
	def __init__(self, parent, powerLevel = 10):
		super().__init__()
		self.powerLevel = powerLevel
		self.parent = parent	# parent is Game, so can get party with self.parent.town.party
		self.initUI()

	def initUI(self):
		self.resize(1024,768)
		self.setWindowTitle('Neverending Fantasy Manager: Dungeon')

		self.layout = qtw.QVBoxLayout()

		self.battlefieldRows = 3
		self.battlefieldColumns = 2
		self.initFields()
		self.initDungeonPartyTable()

		self.fightButton = qtw.QPushButton('Fight!', clicked=self.onBattle)
		self.fightButton.setFixedSize(80,50)

		self.layout.addWidget(self.fightButton)
		self.layout.addWidget(self.partyTable)
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

	def initDungeonPartyTable(self):

		logging.debug('initializing dungeon party table')
		logging.debug(self.parent.town.party)

		self.partyTable = qtw.QTableView()
		# self.partyModel = Player.PlayerTableModel(self.parent.town.party)
		self.partyTable.setModel(self.parent.town.partyModel)

		self.partyTable.setSelectionBehavior(QTableWidget.SelectRows);

		# self.partyTable.setColumnHidden(0, True)
		# self.partyTable.setHorizontalHeaderLabels(self.statTableList)

		self.partyTable.setFixedSize(500,200)
		self.partyTable.resizeColumnsToContents()
		self.partyTable.resizeRowsToContents()



	@pyqtSlot()
	def onBattle(self):
		print('made it')