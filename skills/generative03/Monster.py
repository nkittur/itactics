# TODO: make imports consistent with other classes
import sys, logging, random
from PyQt5 import QtCore, QtGui, QtWidgets
from PyQt5.QtCore import Qt

from NameGenerator import NameGenerator

import Player

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)

class Monster():
   def __init__(self):
      super().__init__()
      self.str = self.GenerateStat()
      self.dex = self.GenerateStat()
      self.con = self.GenerateStat()
      self.int = self.GenerateStat()
      self.spi = self.GenerateStat()
      self.pot = self.GenerateStat()
      self.ovr = self.str + self.dex + self.con + self.int + self.spi

      self.hp = self.con * random.randint(4,6)
      self.mana = self.spi * random.randint(4,6)

      self.pos = 0

      nameGenerator = NameGenerator()
      self.name = nameGenerator.generate()

      self.id = random.randint(1000000,9999999)  # at some point fix this to at least check if the id has been used before

      # while self.id in MainWindow().playerPool:
      #    self.id = random.randint(1000000,9999999)

   def GenerateStat(self):
      return random.randint(1,10)


class MonsterTableModel(Player.PlayerTableModel):

    def __init__(self, data):
        super(MonsterTableModel, self).__init__()
        self._data = data
        self.playerStats = ['pos', 'name', 'ovr', 'pot', 'str', 'dex', 'con', 'int', 'spi', 'hp', 'mana']

    # def data(self, index, role):
    #     if role == Qt.DisplayRole:
    #         stat = self.playerStats[index.column()]
    #         value = getattr(self._data[index.row()], stat)
    #         return str(value)
    #     if role == Qt.UserRole:     # Putting a player object into the UserRole so that we can retrieve the object when the row selected (see https://stackoverflow.com/questions/27931308/how-to-store-and-retrieve-custom-data-using-qtcore-qt-userrole-with-qtablevie)
    #         return self._data[index.row()]
            
    # def setData(self, index, value, role):
    #     if role == Qt.EditRole:
    #         stat = self.playerStats[index.column()]
    #         setattr(self._data[index.row()], stat, value)
    #         return True

    # def rowCount(self, index=QtCore.QModelIndex()):
    #     return len(self._data)

    # def columnCount(self, index):
    #     # return len(self._data[0])
    #     return len(self.playerStats)
    
    # def flags(self, index):
    #     if index.column() == 0:
    #         return Qt.ItemIsSelectable|Qt.ItemIsEnabled|Qt.ItemIsEditable
    #     else:
    #         return Qt.ItemIsSelectable|Qt.ItemIsEnabled

    # def removeRows(self, position, rows, index=QtCore.QModelIndex()):
    #         logging.debug("removeRows called with position={} rows={} so remove {}".format(position,rows,self._data[position].name))
    #         self.beginRemoveRows(index, position, position + rows -1)
    #         for i in range(int(rows)):
    #             self._data.pop(position)
    #             logging.debug(str(self._data))
    #         self.endRemoveRows()
    #         return True

    # def insertRows(self, position, rows=1, index=QtCore.QModelIndex()):

    #     item = index.data(QtCore.Qt.UserRole)

    #     self.beginInsertRows(QtCore.QModelIndex(), position, position + rows - 1)  # see https://stackoverflow.com/questions/13109128/pyqt-qabstracttablemodel-never-updates-when-rows-are-added
    #     for row in range(rows):
    #         logging.debug("inserting " + item.name)
    #         self._data.append(item)
    #         logging.debug(str(self._data))
    #     self.endInsertRows()
    #     return True
