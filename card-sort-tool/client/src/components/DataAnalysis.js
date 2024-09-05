import React, { useState } from 'react';
import styled from 'styled-components';
import SessionList from './SessionList';
import SimilarityMatrix from './SimilarityMatrix';
import Dendrogram from './Dendrogram';

const AnalysisContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  height: 100vh;
`;

const MenuBar = styled.div`
  display: flex;
  justify-content: flex-start;
  padding: 0.5rem;
  background-color: #f0f0f0;
  margin-bottom: 20px;
`;

const MenuButton = styled.button`
  background-color: ${props => (props.active ? '#007bff' : 'transparent')};
  color: ${props => (props.active ? 'white' : '#007bff')};
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  margin-right: 10px;
  font-size: 14px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${props => (props.active ? '#0056b3' : '#e0e0e0')};
  }
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
`;

const AnalysisDiagram = styled.div`
  flex: 3;
  padding: 20px;
  overflow: auto;
`;

function DataAnalysis({ token }) {
  const [activeTab, setActiveTab] = useState('similarityMatrix');
  const [selectedSessions, setSelectedSessions] = useState([]);

  const handleSessionSelect = (sessionId) => {
    setSelectedSessions(prevSelected => {
      return prevSelected.includes(sessionId) 
        ? prevSelected.filter(id => id !== sessionId) 
        : [...prevSelected, sessionId];
    });
  };

  return (
    <AnalysisContainer>
      <MenuBar>
        <MenuButton 
          active={activeTab === 'similarityMatrix'} 
          onClick={() => setActiveTab('similarityMatrix')}
        >
          Similarity Matrix
        </MenuButton>
        <MenuButton 
          active={activeTab === 'dendrogram'} 
          onClick={() => setActiveTab('dendrogram')}
        >
          Dendrogram
        </MenuButton>
      </MenuBar>
      <ContentContainer>
        <SessionList 
          token={token} 
          selectedSessions={selectedSessions} 
          onSessionSelect={handleSessionSelect} 
        />
        <AnalysisDiagram>
          {activeTab === 'similarityMatrix' && (
            <SimilarityMatrix token={token} selectedSessions={selectedSessions} />
          )}
          {activeTab === 'dendrogram' && (
            <Dendrogram token={token} selectedSessions={selectedSessions} />
          )}
        </AnalysisDiagram>
      </ContentContainer>
    </AnalysisContainer>
  );
}

export default DataAnalysis;