import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const TableContainer = styled.div`
  height: 100%;
  width: 100%;
`;

function SessionDataTable({ data }) {
  const [columnDefs] = useState([
    { field: 'sessionName', headerName: 'Session Name', filter: true, sortable: true },
    { field: 'cardTitle', headerName: 'Card Title', filter: true, sortable: true },
    { field: 'cardContent', headerName: 'Card Content', filter: true, sortable: true },
    { field: 'categoryName', headerName: 'Category Name', filter: true, sortable: true },
  ]);

  const defaultColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
    editable: true,
  };

  const onGridReady = useCallback((params) => {
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