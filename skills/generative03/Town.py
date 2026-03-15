import random, logging
from random import randrange
from PyQt5 import QtWidgets as qtw
from PyQt5 import QtGui as qtg
from PyQt5 import QtCore as qtc
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QAction, QTableWidget,QTableWidgetItem,QVBoxLayout
from PyQt5.QtCore import pyqtSlot

from NameGenerator import NameGenerator

import Dungeon, Player

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)



class TownWindow(qtw.QWidget):

   def __init__(self, parent):
      super().__init__()

      self.parent = parent
      # Game = parent

      self.statTableList = ['ID', 'Name', 'Ovr', 'Pot', 'Str', 'Dex', 'Con', 'Int', 'Spi', 'HP', 'Mana']

      self.resize(1024,768)
      self.setWindowTitle('Neverending Fantasy Manager')

      self.initPartyTable()
      self.initHiringPoolTable()

      self.hireButton = qtw.QPushButton('Hire', clicked=self.onHire)
      self.hireButton.setFixedSize(80,50)

      self.dungeonButton = qtw.QPushButton('Dungeon', clicked=self.onDungeon)
      self.dungeonButton.setFixedSize(80,50)

      self.layout = qtw.QVBoxLayout()
      self.layout.addWidget(self.hiringPoolTable)
      self.layout.addWidget(self.hireButton)
      self.layout.addWidget(self.partyTable)
      self.layout.addWidget(self.dungeonButton)
      self.setLayout(self.layout)

      self.show()


   def initPartyTable(self):

      self.party = []
      self.partyTable = qtw.QTableView()
      self.partyModel = Player.PlayerTableModel(self.party)

      # Use a proxy model to enable sorting b/c we are using a custom object: https://stackoverflow.com/questions/37337964/how-to-sort-qtableview-in-qt4-and-up
      # This is having some weird behavior in combination with the hiringPoolModel proxy but don't need sorting on this table so *shrug*
      # proxyModel = qtc.QSortFilterProxyModel()  
      # proxyModel.setSourceModel(self.partyModel)
      # self.partyTable.setModel(proxyModel)      
      # self.partyTable.setSortingEnabled(True)

      self.partyTable.setModel(self.partyModel)

      self.partyTable.setSelectionBehavior(QTableWidget.SelectRows);

      self.partyTable.setColumnHidden(0, True)
      # self.partyTable.setHorizontalHeaderLabels(self.statTableList)

      self.partyTable.setFixedSize(500,200)


   def initHiringPoolTable(self, numPlayers = 5):

      # Generate new players
      hiringPool = []
      for x in range(numPlayers):
         player = Player.Player()
         hiringPool.append(player)


      self.hiringPoolTable = qtw.QTableView()
      self.hiringPoolModel = Player.PlayerTableModel(hiringPool)

      # Use a proxy model to enable sorting b/c we are using a custom object: https://stackoverflow.com/questions/37337964/how-to-sort-qtableview-in-qt4-and-up
      proxyModel = qtc.QSortFilterProxyModel()  
      proxyModel.setSourceModel(self.hiringPoolModel)

      self.hiringPoolTable.setModel(proxyModel)
      self.hiringPoolTable.setSortingEnabled(True)

      self.hiringPoolTable.resizeColumnsToContents()
      self.hiringPoolTable.resizeRowsToContents()
      self.hiringPoolTable.setSelectionBehavior(QTableWidget.SelectRows);

      self.hiringPoolTable.setColumnHidden(0, True)


      # table selection change
      self.hiringPoolTable.clicked.connect(self.onClick)

   @pyqtSlot()
   def onClick(self):
      indexes = self.hiringPoolTable.selectionModel().selectedRows()
      for index in sorted(indexes):
         #cell2 = self.hiringPoolModel.data(index, qtc.Qt.UserRole)  # Using UserRole to get the player object (https://stackoverflow.com/questions/27931308/how-to-store-and-retrieve-custom-data-using-qtcore-qt-userrole-with-qtablevie)
         # note that if we wanted the text of the cell itself we could call index.data() which defaults to the DisplayRole
         player = index.data(qtc.Qt.UserRole) # this is an equivalent and more concise way to get the player object from the UserRole directly from the index's data method
         logging.debug(player.name)


   @pyqtSlot()
   def onHire(self):
      # add player from table row to hired player

      indexes = self.hiringPoolTable.selectionModel().selectedRows()
      for index in sorted(indexes):
         player = index.data(qtc.Qt.UserRole) # this is an equivalent and more concise way to get the player object from the UserRole directly from the index's data method

      self.partyModel.insertRow(self.partyModel.rowCount(), index)

      self.partyTable.resizeColumnsToContents()
      self.partyTable.resizeRowsToContents()

      self.hiringPoolModel.removeRow(index.row())


   @pyqtSlot()
   def onDungeon(self):
      self.dungeon = Dungeon.DungeonWindow(parent=self.parent)
      self.close()         # this destroys the current window; can call .hide() to hide it instead if we want to resume it
      self.dungeon.show()  # https://stackoverflow.com/questions/36768033/pyqt-how-to-open-new-window
                           # this is also a useful tutorial: https://www.learnpyqt.com/tutorials/creating-multiple-windows/
