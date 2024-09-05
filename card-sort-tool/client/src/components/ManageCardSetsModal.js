import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaTrash, FaPencilAlt } from 'react-icons/fa';
import Papa from 'papaparse';
import axios from 'axios';
import Card from './Card';
import Dialog from './Dialog';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 800px;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CardSetListContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-right: 20px;
`;

const CardSetList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  width: 200px;
  margin-bottom: 10px;
`;

const CardSetItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ccc;
  cursor: pointer;
  background-color: ${props => props.selected ? '#e0e0e0' : 'white'};

  &:hover {
    background-color: #f0f0f0;
  }
`;

const EditNameInput = styled.input`
  border: none;
  background-color: transparent;
  font-size: inherit;
  width: 70%;
  &:focus {
    outline: none;
    border-bottom: 1px solid #007bff;
  }
`;

const CardPreview = styled.div`
  flex-grow: 1;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
`;

const ImportButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  margin-top: 10px;

  &:hover {
    background-color: #0056b3;
  }
`;

const CloseButton = styled.button`
  background-color: #ccc;
  color: black;
  border: none;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;

  &:hover {
    background-color: #999;
  }
`;

const ConfirmDialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ConfirmDialogContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 300px;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
`;

const ConfirmButton = styled.button`
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
`;

const CancelButton = styled.button`
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
`;

function ConfirmDialog({ message, cardSetName, onConfirm, onCancel }) {
  return (
    <ConfirmDialogOverlay>
      <ConfirmDialogContent>
        <p>{message}</p>
        <p><strong>"{cardSetName}"</strong></p>
        <ButtonContainer>
          <ConfirmButton onClick={onConfirm}>Delete</ConfirmButton>
          <CancelButton onClick={onCancel}>Cancel</CancelButton>
        </ButtonContainer>
      </ConfirmDialogContent>
    </ConfirmDialogOverlay>
  );
}

function ManageCardSetsModal({ onClose, token }) {
  const [cardSets, setCardSets] = useState([]);
  const [selectedCardSet, setSelectedCardSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [dialogMessage, setDialogMessage] = useState('');
  const [editingCardSetId, setEditingCardSetId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCardSets();
  }, []);

  const fetchCardSets = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/card-sets`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      console.log('Fetched card sets:', response.data);
      setCardSets(response.data);
    } catch (error) {
      console.error('Error fetching card sets:', error);
    }
  };

  const fetchCards = async (cardSetId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/card-sets/${cardSetId}/cards`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      console.log('Fetched cards for card set:', cardSetId, response.data);
      setCards(response.data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const handleDeleteCardSet = (cardSet) => {
    setConfirmDelete(cardSet);
  };

  const confirmDeleteCardSet = async () => {
    const cardSet = confirmDelete;
    setConfirmDelete(null);
    try {
      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/card-sets/${cardSet.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      
      if (response.status === 200) {
        setCardSets(cardSets.filter(cs => cs.id !== cardSet.id));
        if (selectedCardSet && selectedCardSet.id === cardSet.id) {
          setSelectedCardSet(null);
          setCards([]);
        }
      } else {
        throw new Error('Failed to delete card set');
      }
    } catch (error) {
      console.error('Error deleting card set:', error);
      setDialogMessage(error.response?.data?.error || 'Error deleting card set. Please try again.');
    }
  };

  const cancelDeleteCardSet = () => {
    setConfirmDelete(null);
  };

  const handleImportCardSet = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          const parsedData = results.data;
          console.log('Raw parsed data:', parsedData);

          if (parsedData.length < 2) {
            setDialogMessage('The CSV file is empty or contains only headers.');
            return;
          }

          // Find the first row with two non-empty columns (assuming it's the data)
          const firstDataRowIndex = parsedData.findIndex(row => row.length >= 2 && row[0] && row[1]);
          if (firstDataRowIndex === -1) {
            setDialogMessage('No valid data found in the CSV file. Ensure there are at least two columns with non-empty values.');
            return;
          }

          console.log('First data row index:', firstDataRowIndex);

          const newCardSet = {
            name: file.name.replace('.csv', '').replace(/[_-]/g, ' '), // Replace underscores and hyphens with spaces
            cards: parsedData.slice(firstDataRowIndex)
              .filter(row => row.length >= 2 && row[0] && row[1]) // Filter out invalid rows
              .map((row, index) => ({
                title: row[0], // Remove slice(0, 50) to allow longer titles
                text: row[1],
                originalIndex: index + firstDataRowIndex + 1, // For error reporting
              })),
          };

          console.log('Processed card set:', newCardSet);

          // Validate the parsed data
          const invalidRows = parsedData.slice(firstDataRowIndex)
            .map((row, index) => ({ row, index: index + firstDataRowIndex + 1 }))
            .filter(({ row }) => row.length < 2 || !row[0] || !row[1]);

          console.log('Invalid rows:', invalidRows);

          if (invalidRows.length > 0) {
            let errorMessage = 'The following issues were found in the CSV file:\n\n';
            
            if (invalidRows.length > 0) {
              errorMessage += `- ${invalidRows.length} row(s) with missing title or text: ` +
                `Row ${invalidRows.map(({ index }) => index).join(', ')}\n`;
            }

            setDialogMessage(errorMessage);
          }

          if (newCardSet.cards.length === 0) {
            setDialogMessage('No valid cards found in the CSV file after removing invalid rows.');
            return;
          }

          // Show the card set in the preview window
          setSelectedCardSet(newCardSet);
          setCards(newCardSet.cards);

          // Persist the card set to the API
          persistCardSet(newCardSet);

          // Clear the file input
          event.target.value = '';
        },
        error: (error) => {
          console.error('Papa Parse error:', error);
          setDialogMessage(`Error parsing CSV file: ${error.message}`);
          // Clear the file input
          event.target.value = '';
        },
        delimiter: ",",
        quoteChar: '"',
        escapeChar: '"',
        skipEmptyLines: true,
      });
    }
  };

  const persistCardSet = async (newCardSet) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/card-sets`, 
        {
          name: newCardSet.name,
          cards: newCardSet.cards.map(({ title, text }) => ({ title, text })) // Remove originalIndex
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );
      setCardSets([...cardSets, response.data]);
    } catch (error) {
      console.error('Error importing card set:', error);
      setDialogMessage('Error importing card set. Please try again.');
    }
  };

  const handleCardSetClick = (cardSet) => {
    console.log('Card set clicked:', cardSet);
    setSelectedCardSet(cardSet);
    fetchCards(cardSet.id);
  };

  const closeDialog = () => {
    setDialogMessage('');
  };

  const handleEditCardSetName = (cardSet) => {
    setEditingCardSetId(cardSet.id);
    setEditingName(cardSet.name);
  };

  const handleSaveCardSetName = async () => {
    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/card-sets/${editingCardSetId}`, 
        { name: editingName },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );
      setCardSets(cardSets.map(cs => cs.id === editingCardSetId ? { ...cs, name: editingName } : cs));
      setEditingCardSetId(null);
    } catch (error) {
      console.error('Error updating card set name:', error);
      setDialogMessage('Error updating card set name. Please try again.');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleEditCard = async (cardId, newTitle, newText) => {
    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/card-sets/cards/${cardId}`, 
        { title: newTitle, text: newText },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );
      setCards(cards.map(card => card.id === cardId ? { ...card, title: newTitle, text: newText } : card));
    } catch (error) {
      console.error('Error updating card:', error);
      setDialogMessage('Error updating card. Please try again.');
    }
  };

  const handleDeleteCard = async (cardId) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/card-sets/cards/${cardId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setCards(cards.filter(card => card.id !== cardId));
    } catch (error) {
      console.error('Error deleting card:', error);
      setDialogMessage('Error deleting card. Please try again.');
    }
  };

  return (
    <ModalOverlay>
      <ModalContent>
        <Header>
          <h2>Manage Card Sets</h2>
          <CloseButton onClick={onClose}>Close</CloseButton>
        </Header>
        <div style={{ display: 'flex' }}>
          <CardSetListContainer>
            <CardSetList>
              {cardSets.map(cardSet => (
                <CardSetItem
                  key={cardSet.id}
                  selected={selectedCardSet && selectedCardSet.id === cardSet.id}
                  onClick={() => handleCardSetClick(cardSet)}
                >
                  {editingCardSetId === cardSet.id ? (
                    <EditNameInput
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleSaveCardSetName}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveCardSetName()} // Changed from onKeyPress to onKeyDown
                      autoFocus
                    />
                  ) : (
                    <span>{cardSet.name}</span>
                  )}
                  <div>
                    <FaPencilAlt onClick={() => handleEditCardSetName(cardSet)} style={{ cursor: 'pointer', marginRight: '10px' }} />
                    <FaTrash 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering card set selection
                        handleDeleteCardSet(cardSet);
                      }} 
                      style={{ cursor: 'pointer' }} 
                    />
                  </div>
                </CardSetItem>
              ))}
            </CardSetList>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImportCardSet} 
              ref={fileInputRef}
              style={{ display: 'none' }}  // Hide the actual file input
            />
            <ImportButton onClick={triggerFileInput}>Import Card Set</ImportButton>
          </CardSetListContainer>
          <CardPreview>
            {selectedCardSet && cards.length > 0 ? (
              cards.map(card => (
                <Card
                  key={card.id}
                  id={card.id}
                  title={card.title}
                  text={card.text}
                  onEdit={handleEditCard}
                  onDelete={handleDeleteCard}
                  editable={true}
                  cardSetName={selectedCardSet.name}
                />
              ))
            ) : (
              <p>Select a card set to preview</p>
            )}
          </CardPreview>
        </div>
        {confirmDelete && (
          <ConfirmDialog
            message="Are you sure you want to delete this card set?"
            cardSetName={confirmDelete.name}
            onConfirm={confirmDeleteCardSet}
            onCancel={cancelDeleteCardSet}
          />
        )}
        {dialogMessage && <Dialog message={dialogMessage} onClose={closeDialog} />}
      </ModalContent>
    </ModalOverlay>
  );
}

export default ManageCardSetsModal;