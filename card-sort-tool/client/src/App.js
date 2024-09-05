import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import Login from './components/Login';
import CardSortingArea from './components/CardSortingArea';
import NewSessionDialog from './components/NewSessionDialog';
import ManageCardSetsModal from './components/ManageCardSetsModal';
import DataAnalysis from './components/DataAnalysis';
import ExternalSorting from './components/ExternalSorting';
import ShareSessionModal from './components/ShareSessionModal';
import { FaSignOutAlt, FaCopy } from 'react-icons/fa';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const TitleBar = styled.div`
  background-color: #4a90e2;
  color: white;
  padding: 1rem;
  text-align: center;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LogoutButton = styled.button`
  background-color: transparent;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 1rem;

  &:hover {
    color: #ff4d4d;
  }
`;

const MenuBar = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: #f0f0f0;
`;

const Button = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background-color: #0056b3;
  }
`;

const Select = styled.select`
  padding: 8px;
  font-size: 1rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-right: 10px;
`;

const MenuGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const ShareButton = styled(Button)`
  background-color: ${props => props.$isSharing ? '#4CAF50' : '#007bff'};
  &:hover {
    background-color: ${props => props.$isSharing ? '#45a049' : '#0056b3'};
  }
`;

const CopyIcon = styled(FaCopy)`
  margin-left: 5px;
  cursor: pointer;
  color: #007bff;
  
  &:hover {
    color: #0056b3;
  }
`;

const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const Tooltip = styled.span`
  visibility: hidden;
  width: 200px;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  margin-left: -100px;
  opacity: 0;
  transition: opacity 0.3s;

  ${TooltipContainer}:hover & {
    visibility: visible;
    opacity: 1;
  }

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #555 transparent transparent transparent;
  }
`;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedCardSets, setSelectedCardSets] = useState([]);
  const [mode, setMode] = useState('dataCollection');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharingUrl, setSharingUrl] = useState('');
  const [copyNotification, setCopyNotification] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data);
      
      if (response.data.length > 0) {
        const firstSessionId = response.data[0].id;
        await loadSession(firstSessionId);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  }, [token]);

  const fetchSharingStatus = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/sessions/${sessionId}/sharing-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSharing(response.data.isSharing);
      if (response.data.isSharing && response.data.id) {
        const clientUrl = process.env.REACT_APP_CLIENT_URL || window.location.origin;
        const fullSharingUrl = `${clientUrl}/external-sorting/${response.data.id}`;
        console.log('REACT_APP_CLIENT_URL:', process.env.REACT_APP_CLIENT_URL);
        console.log('Full Sharing URL:', fullSharingUrl);
        setSharingUrl(fullSharingUrl);
      } else {
        setSharingUrl('');
      }
    } catch (error) {
      console.error('Error fetching sharing status:', error);
    }
  }, [token]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchSessions();
    }
  }, [isLoggedIn, token, fetchSessions]);

  useEffect(() => {
    if (currentSession) {
      fetchSharingStatus(currentSession.id);
    }
  }, [currentSession, fetchSharingStatus]);

  const loadSession = useCallback(async (sessionId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentSession(response.data);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, [token]);

  const handleSessionChange = async (e) => {
    const sessionId = e.target.value;
    await loadSession(sessionId);
  };

  const handleCreateSession = () => {
    setShowNewSessionDialog(true);
  };

  const handleConfirmCreateSession = async (sessionName) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/sessions`, {
        name: sessionName,
        cardSetIds: selectedCardSets
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newSession = response.data;
      setSessions([...sessions, newSession]);
      setShowNewSessionDialog(false);
      setSelectedCardSets([]);
      
      // Select the newly created session
      setCurrentSession(newSession);
      await loadSession(newSession.id);
    } catch (error) {
      console.error('Error creating session:', error);
      // Handle error (e.g., show an error message to the user)
    }
  };

  const handleCancelCreateSession = () => {
    setShowNewSessionDialog(false);
    setSelectedCardSets([]);
  };

  const handleExportData = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/sessions/${currentSession}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${currentSession}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleManageCards = () => {
    setShowManageModal(true);
  };

  const handleCloseManageModal = () => {
    setShowManageModal(false);
  };

  const handleLogin = (token) => {
    setToken(token);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setToken(null);
    setIsLoggedIn(false);
  };

  const handleShareSession = () => {
    setShowShareModal(true);
  };

  const handleConfirmShare = async (startDate, endDate, password) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/sessions/${currentSession.id}/share`, {
        valid_from: startDate.toISOString(),
        valid_to: endDate.toISOString(),
        password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSharing(true);
      const clientUrl = process.env.REACT_APP_CLIENT_URL || window.location.origin;
      const fullSharingUrl = `${clientUrl}/external-sorting/${response.data.id}`;
      console.log('REACT_APP_CLIENT_URL:', process.env.REACT_APP_CLIENT_URL);
      console.log('Full Sharing URL:', fullSharingUrl);
      setSharingUrl(fullSharingUrl);
      setShowShareModal(false);
      await fetchSharingStatus(currentSession.id);  // Fetch the updated sharing status
    } catch (error) {
      console.error('Error sharing session:', error);
      // Handle error (e.g., show an error message to the user)
    }
  };

  const handleCancelShare = () => {
    setShowShareModal(false);
  };

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(sharingUrl).then(() => {
      setCopyNotification('URL copied!');
      setTimeout(() => setCopyNotification(''), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      setCopyNotification('Failed to copy URL');
      setTimeout(() => setCopyNotification(''), 2000);
    });
  };

  const handleCreateCategory = async (newCategoryName) => {
    const response = await axios.post(`${process.env.REACT_APP_API_URL}/sessions/${currentSession.id}/categories`, 
      { name: newCategoryName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  };

  const handleRenameCategory = async (categoryId, newName) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/sessions/${currentSession.id}/categories/${categoryId}`, 
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update the local state
      setCurrentSession(prevSession => ({
        ...prevSession,
        categories: {
          ...prevSession.categories,
          [categoryId]: { ...prevSession.categories[categoryId], name: newName }
        }
      }));
    } catch (error) {
      console.error('Error renaming category:', error);
      // Handle error (e.g., show an error message to the user)
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/sessions/${currentSession.id}/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update the local state
      setCurrentSession(prevSession => {
        const { [categoryId]: deletedCategory, ...remainingCategories } = prevSession.categories;
        return {
          ...prevSession,
          categories: remainingCategories,
          unsortedCards: [...prevSession.unsortedCards, ...(deletedCategory?.cards || [])]
        };
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      // Handle error (e.g., show an error message to the user)
    }
  };

  const handleMoveCard = async (cardId, categoryId) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/sessions/${currentSession.id}/cards/${cardId}`, {
        category: categoryId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentSession(prevSession => {
        const updatedSession = { ...prevSession };
        let card;

        // Find and remove the card from its current location
        if (updatedSession.unsortedCards.some(c => c.id.toString() === cardId.toString())) {
          card = updatedSession.unsortedCards.find(c => c.id.toString() === cardId.toString());
          updatedSession.unsortedCards = updatedSession.unsortedCards.filter(c => c.id.toString() !== cardId.toString());
        } else {
          Object.values(updatedSession.categories).forEach(category => {
            if (category.cards && category.cards.some(c => c.id.toString() === cardId.toString())) {
              card = category.cards.find(c => c.id.toString() === cardId.toString());
              category.cards = category.cards.filter(c => c.id.toString() !== cardId.toString());
            }
          });
        }

        if (!card) {
          console.error('Card not found:', cardId);
          return updatedSession;
        }

        // Add the card to its new location
        if (categoryId === null) {
          updatedSession.unsortedCards.push(card);
        } else {
          if (!updatedSession.categories[categoryId]) {
            updatedSession.categories[categoryId] = { id: categoryId, name: 'Unknown Category', cards: [] };
          }
          if (!updatedSession.categories[categoryId].cards) {
            updatedSession.categories[categoryId].cards = [];
          }
          updatedSession.categories[categoryId].cards.push(card);
        }

        return updatedSession;
      });
    } catch (error) {
      console.error('Error moving card:', error);
    }
  };

  return (
    <Router>
      <AppContainer>
        <Routes>
          {/* External sorting route - no authentication required */}
          <Route path="/external-sorting/:id" element={<ExternalSorting />} />
          
          {/* All other routes */}
          <Route path="/*" element={
            isLoggedIn ? (
              <>
                <TitleBar>
                  <h1>CardSortTool</h1>
                  <LogoutButton onClick={handleLogout}>
                    <FaSignOutAlt style={{ marginRight: '5px' }} />
                    Logout
                  </LogoutButton>
                </TitleBar>
                <MenuBar>
                  <MenuGroup>
                    <Button onClick={() => setMode('dataCollection')} style={{ backgroundColor: mode === 'dataCollection' ? '#0056b3' : '#007bff' }}>
                      Data Collection
                    </Button>
                    <Button onClick={() => setMode('dataAnalysis')} style={{ backgroundColor: mode === 'dataAnalysis' ? '#0056b3' : '#007bff' }}>
                      Data Analysis
                    </Button>
                  </MenuGroup>
                </MenuBar>
                {mode === 'dataCollection' ? (
                  <>
                    <MenuBar>
                      <MenuGroup>
                        <Button onClick={handleCreateSession}>New Session</Button>
                        <Button onClick={handleExportData}>Export Data</Button>
                        <Select
                          value={currentSession?.id || ''}
                          onChange={handleSessionChange}
                        >
                          {sessions.map(session => (
                            <option key={session.id} value={session.id}>{session.name}</option>
                          ))}
                        </Select>
                        <ShareButton onClick={handleShareSession} $isSharing={isSharing}>
                          {isSharing ? 'Sharing Session' : 'Share Session'}
                        </ShareButton>
                        {isSharing && (
                          <TooltipContainer>
                            <CopyIcon onClick={handleCopyShareUrl} />
                            <Tooltip>{sharingUrl}</Tooltip>
                          </TooltipContainer>
                        )}
                        {copyNotification && <span>{copyNotification}</span>}
                      </MenuGroup>
                      <MenuGroup>
                        <Button onClick={handleManageCards}>Manage Cards</Button>
                      </MenuGroup>
                    </MenuBar>
                    {currentSession && (
                      <CardSortingArea
                        session={currentSession}
                        apiUrl={`${process.env.REACT_APP_API_URL}/sessions/${currentSession.id}`}
                        authHeader={{ Authorization: `Bearer ${token}` }}
                        onCreateCategory={handleCreateCategory}
                        onRenameCategory={handleRenameCategory}
                        onDeleteCategory={handleDeleteCategory}
                        onMoveCard={handleMoveCard}
                      />
                    )}
                    {showNewSessionDialog && (
                      <NewSessionDialog
                        token={token}
                        selectedCardSets={selectedCardSets}
                        setSelectedCardSets={setSelectedCardSets}
                        onConfirm={handleConfirmCreateSession}
                        onCancel={handleCancelCreateSession}
                      />
                    )}
                    {showManageModal && <ManageCardSetsModal onClose={handleCloseManageModal} token={token} />}
                    {showShareModal && (
                      <ShareSessionModal
                        onConfirm={handleConfirmShare}
                        onCancel={handleCancelShare}
                      />
                    )}
                  </>
                ) : (
                  <DataAnalysis token={token} />
                )}
              </>
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />
        </Routes>
      </AppContainer>
    </Router>
  );
}

export default App;