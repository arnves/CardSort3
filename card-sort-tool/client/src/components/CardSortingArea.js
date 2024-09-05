import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import Category from './Category';
import UnsortedCards from './UnsortedCards';

const MainContainer = styled.div`
  display: flex;
  height: 100%;
`;

const CategoriesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start; /* Left align categories */
  padding: 20px;
  flex: 3;
`;

const UnsortedContainerWrapper = styled.div`
  flex: 1;
  padding: 20px;
  border-left: 1px solid #ccc;
`;

function CardSortingArea({ session, apiUrl, authHeader, onCreateCategory, onRenameCategory, onDeleteCategory, onMoveCard }) {
  const [categories, setCategories] = useState({});
  const [unsortedCards, setUnsortedCards] = useState([]);

  useEffect(() => {
    if (session) {
      setCategories(session.categories || {});
      setUnsortedCards(session.unsortedCards || []);
    }
  }, [session]);

  const handleDragStart = (e, cardId, sourceCategory) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('sourceCategory', sourceCategory);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, destinationCategory) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const sourceCategory = e.dataTransfer.getData('sourceCategory');

    if (sourceCategory === destinationCategory) return;

    try {
      await onMoveCard(cardId, destinationCategory === 'Unsorted' ? null : destinationCategory);
    } catch (error) {
      console.error('Error updating card category:', error);
    }
  };

  const handleCreateCategory = async (newCategoryName) => {
    try {
      const newCategory = await onCreateCategory(newCategoryName);
      setCategories(prev => ({
        ...prev,
        [newCategory.id]: { id: newCategory.id, name: newCategory.name, cards: [] }
      }));
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleRenameCategory = async (categoryId, newName) => {
    try {
      const response = await axios.put(`${apiUrl}/categories/${categoryId}`, 
        { name: newName },
        { headers: authHeader }
      );

      if (response.status === 200) {
        // Update the frontend state
        setCategories(prev => {
          const updatedCategories = { ...prev };
          updatedCategories[categoryId] = { ...updatedCategories[categoryId], name: newName };
          return updatedCategories;
        });
      } else {
        console.error('Error renaming category:', response.data.error);
        // You might want to add some error handling here, such as showing an error message to the user
      }
    } catch (error) {
      console.error('Error renaming category:', error.response ? error.response.data : error.message);
      // You might want to add some error handling here, such as showing an error message to the user
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      // Get the category to be deleted
      const categoryToDelete = categories[categoryId];
      
      // Move all cards from the category to unsorted
      const updatedUnsortedCards = [...unsortedCards, ...categoryToDelete.cards];
      setUnsortedCards(updatedUnsortedCards);

      // Remove the category from the categories state
      const updatedCategories = { ...categories };
      delete updatedCategories[categoryId];
      setCategories(updatedCategories);

      // Update the backend
      await axios.delete(`${apiUrl}/categories/${categoryId}`, {
        headers: authHeader
      });

      // Update each card in the deleted category to be unsorted
      const updatePromises = categoryToDelete.cards.map(card => 
        axios.put(`${apiUrl}/cards/${card.id}`, 
          { category: null },
          { headers: authHeader }
        )
      );

      await Promise.all(updatePromises);

    } catch (error) {
      console.error('Error deleting category:', error);
      // You might want to add some error handling here, such as showing an error message to the user
    }
  };

  return (
    <MainContainer>
      <CategoriesContainer>
        {Object.values(categories).map(category => (
          <Category
            key={category.id}
            categoryId={category.id}
            name={category.name}
            cards={category.cards}
            onDelete={() => onDeleteCategory(category.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onRename={onRenameCategory}  // Pass the onRenameCategory function here
            isNewCategory={category.name === 'New Category'}
            apiUrl={apiUrl}
            authHeader={authHeader}
          />
        ))}
      </CategoriesContainer>
      <UnsortedContainerWrapper>
        <UnsortedCards 
          cards={unsortedCards} 
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onCreateCategory={onCreateCategory}
        />
      </UnsortedContainerWrapper>
    </MainContainer>
  );
}

export default CardSortingArea;