import random, logging
from random import randrange
from PyQt5 import QtWidgets as qtw
from PyQt5 import QtGui as qtg
from PyQt5 import QtCore as qtc
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QAction, QTableWidget,QTableWidgetItem,QVBoxLayout
from PyQt5.QtCore import pyqtSlot

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)


class DungeonWindow(qtw.QWidget):
	def __init__(self, powerLevel = 10):
		super().__init__()

		self.powerLevel = powerLevel

		self.resize(1024,768)
		self.setWindowTitle('Neverending Fantasy Manager: Dungeon')

		self.layout = qtw.QVBoxLayout()

		self.hireButton = qtw.QPushButton('Hire', clicked=self.onHire)
		self.hireButton.setFixedSize(80,50)

		self.layout.addWidget(self.hireButton)

		self.setLayout(self.layout)

		self.show()

		logging.debug(self.partyTable)

	@pyqtSlot()
	def onHire(self):
		print('made it')