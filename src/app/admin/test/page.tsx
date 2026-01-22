'use client';

import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

export default function TableTest() {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          <TableRow>
            <TableCell>Blog A</TableCell>
            <TableCell>Published</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
