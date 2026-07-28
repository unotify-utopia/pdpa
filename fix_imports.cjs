const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const endIdx = c.indexOf('import {', c.indexOf("} from './types';"));
const newImports = `import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  UserCheck,
  CheckCircle,
  Search,
  FileSpreadsheet,
  List,
  Layers,
  User,
  Users,
  Send,
  AlertTriangle,
  Lock,
  Plus,
  DollarSign,
  Download,
  Trash2,
  BookOpen,
  ArrowLeft,
  Mail,
  FileCheck2,
  Scale,
  Building2,
  MessageSquare,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';

import type {
  Request,
  RequestStatus,
  User as UserType,
  Role,
  ComplianceConfig,
  DocumentTemplate,
  AuditLog,
  MessageThread,
  Attachment,
  DataCollectionTask,
  RedactionRecord
} from './types';

`;

fs.writeFileSync('src/App.tsx', newImports + c.slice(endIdx));
console.log('Done');
