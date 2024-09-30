import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const MatrixTable = styled.table`
  border-collapse: separate;
  border-spacing: 0;
`;

const MatrixCell = styled.td`
  background-color: ${props => props.isHighlighted ? '#ffff00' : `rgba(0, 0, 255, ${props.value})`};
  color: ${props => props.value > 0.5 ? 'white' : 'black'};
  text-align: center;
  width: 40px;
  height: 40px;
  font-size: 0.8em;
  padding: 0;
  cursor: pointer;
`;

const CardNameCell = styled.td`
  white-space: nowrap;
  overflow: visible;
  font-size: 0.8em;
  padding-left: 10px;
  position: relative;
`;

const CardNameSpan = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  background-color: ${props => props.isHighlighted ? '#ffff00' : 'white'};
  padding: 2px 5px;
  border: 1px solid #ccc;
  border-radius: 3px;
`;

function SimilarityMatrix({ token, selectedSessions }) {
  const [similarityMatrix, setSimilarityMatrix] = useState(null);
  const [cardNames, setCardNames] = useState([]);
  const [highlightedCells, setHighlightedCells] = useState([]);

  useEffect(() => {
    const fetchCardData = async () => {
      if (selectedSessions.length === 0) {
        setSimilarityMatrix(null);
        setCardNames([]);
        return;
      }

      try {
        const cardDataPromises = selectedSessions.map(sessionId =>
          axios.get(`/api/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
        const cardDataResponses = await Promise.all(cardDataPromises);
        const cardData = cardDataResponses.map(response => response.data);
        const { matrix, cards } = createSimilarityMatrix(cardData);
        setSimilarityMatrix(matrix);
        setCardNames(cards);
      } catch (error) {
        console.error('Error fetching card data:', error);
      }
    };

    fetchCardData();
  }, [token, selectedSessions]);

  const createSimilarityMatrix = (sessions) => {
    const allCards = [...new Set(sessions.flatMap(session => 
      Object.values(session.categories).flatMap(category => 
        category.cards.map(card => card.title)
      )
    ))];

    const matrix = Array(allCards.length).fill(null).map(() => Array(allCards.length).fill(0));

    sessions.forEach(session => {
      const cardsByCategory = {};
      Object.values(session.categories).forEach(category => {
        if (category.name !== 'Unsorted') {
          cardsByCategory[category.name] = category.cards.map(card => card.title);
        }
      });

      Object.values(cardsByCategory).forEach(categoryCards => {
        for (let i = 0; i < categoryCards.length; i++) {
          for (let j = i + 1; j < categoryCards.length; j++) {
            const cardAIndex = allCards.indexOf(categoryCards[i]);
            const cardBIndex = allCards.indexOf(categoryCards[j]);
            if (cardAIndex !== -1 && cardBIndex !== -1) {
              matrix[cardAIndex][cardBIndex]++;
              matrix[cardBIndex][cardAIndex]++;
            }
          }
        }
      });
    });

    const normalizedMatrix = matrix.map(row => row.map(cell => cell / sessions.length));

    return { matrix: normalizedMatrix, cards: allCards };
  };

  const handleCellClick = useCallback((rowIndex, cellIndex) => {
    if (rowIndex === cellIndex) return;
    setHighlightedCells([rowIndex, cellIndex]);
  }, []);

  const isHighlighted = useCallback((rowIndex, cellIndex) => {
    return highlightedCells.includes(rowIndex) && highlightedCells.includes(cellIndex);
  }, [highlightedCells]);

  if (!similarityMatrix) {
    return <p>Select sessions to generate the similarity matrix.</p>;
  }

  return (
    <MatrixTable>
      <thead>
        <tr>
          <th></th>
          {cardNames.map((_, index) => (
            <th key={index}>{index + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {similarityMatrix.map((row, rowIndex) => (
          <tr key={rowIndex}>
            <td>{rowIndex + 1}</td>
            {row.map((cell, cellIndex) => (
              cellIndex < rowIndex ? (
                <MatrixCell
                  key={cellIndex}
                  value={cell}
                  isHighlighted={isHighlighted(rowIndex, cellIndex)}
                  onClick={() => handleCellClick(rowIndex, cellIndex)}
                >
                  {(cell * 100).toFixed(0)}
                </MatrixCell>
              ) : cellIndex === rowIndex ? (
                <CardNameCell key={cellIndex}>
                  <CardNameSpan 
                    title={cardNames[rowIndex]}
                    isHighlighted={highlightedCells.includes(rowIndex)}
                  >
                    {cardNames[rowIndex]}
                  </CardNameSpan>
                </CardNameCell>
              ) : (
                <td key={cellIndex}></td>
              )
            ))}
          </tr>
        ))}
      </tbody>
    </MatrixTable>
  );
}

export default SimilarityMatrix;