import { LinearProgress } from '@material-ui/core'
import React from 'react'
import { Container } from 'react-bootstrap'
import './LoadingFileExplorer.scss'

export default function LoadingFileExplorer() {
  return <Container className="loading-file-explorer">
    <LinearProgress variant="indeterminate" />
  </Container>
}

