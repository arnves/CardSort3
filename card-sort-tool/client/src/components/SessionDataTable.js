import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import axios from 'axios';

const TableContainer = styled.div`
  height: 100%;
  width: 100%;
`;

function SessionDataTable({ data, token }) {
  const [gridApi, setGridApi] = useState(null);
  const [categories, setCategories] = useState({});

  useEffect(() => {
    if (data.length > 0) {
      const uniqueSessionIds = [...new Set(data.map(item => item.sessionId))];
      fetchAllCategories(uniqueSessionIds);
    }
  }, [data, token]);

  const fetchAllCategories = async (sessionIds) => {
    try {
      const categoryPromises = sessionIds.map(sessionId => 
        axios.get(`${process.env.REACT_APP_API_URL}/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      const sessionResponses = await Promise.all(categoryPromises);
      
      const allCategories = {};
      sessionResponses.forEach(response => {
        const session = response.data;
        Object.values(session.categories).forEach(category => {
          allCategories[category.name.toLowerCase()] = { name: category.name, id: category.id };
        });
      });

      setCategories(allCategories);
    } catch (error) {
      console.error('Error fetching all categories:', error);
    }
  };

  const [columnDefs] = useState([
    { field: 'sessionName', headerName: 'Session Name', filter: true, sortable: true },
    { field: 'cardTitle', headerName: 'Card Title', filter: true, sortable: true },
    { field: 'cardContent', headerName: 'Card Content', filter: true, sortable: true },
    { 
      field: 'categoryName', 
      headerName: 'Category Name', 
      filter: true, 
      sortable: true,
      editable: true,
      cellEditor: 'agTextCellEditor',
      onCellValueChanged: async (params) => {
        const { data: cellData, newValue, oldValue } = params;
        if (newValue === oldValue) return;

        try {
          const sessionId = cellData.sessionId;
          const cardId = cellData.cardId;

          // Check if the category exists by name (case-insensitive)
          let categoryInfo = categories[newValue.toLowerCase()];

          // If the category doesn't exist, create it
          if (!categoryInfo) {
            const response = await axios.post(
              `${process.env.REACT_APP_API_URL}/sessions/${sessionId}/categories`,
              { name: newValue },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            categoryInfo = { name: newValue, id: response.data.id };
            setCategories(prev => ({...prev, [newValue.toLowerCase()]: categoryInfo }));
          }

          // Update the card's category
          await axios.put(
            `${process.env.REACT_APP_API_URL}/sessions/${sessionId}/cards/${cardId}`,
            { category: categoryInfo.id },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          console.log(`Updated card ${cardId} category to ${newValue}`);
        } catch (error) {
          console.error('Error updating category:', error);
          params.node.setDataValue('categoryName', oldValue);
        }
      }
    },
  ]);

  const defaultColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
  };

  const onGridReady = useCallback((params) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  }, []);

  return (
    <TableContainer className="ag-theme-alpine">
      <AgGridReact
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        rowData={data}
        enableFilter={true}
        enableSorting={true}
      />
    </TableContainer>
  );
}

export default SessionDataTable;