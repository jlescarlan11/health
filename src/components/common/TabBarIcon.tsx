import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface TabBarIconProps {
  name: string;
  focused: boolean;
  color: string;
  size?: number;
}

export const TabBarIcon: React.FC<TabBarIconProps> = ({
  name,
  focused,
  color,
  size = 24,
}) => {
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TabBarIcon.tsx:18',message:'TabBarIcon render with Ionicons',data:{iconName:name,focused,color,size,iconLibrary:'@expo/vector-icons'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  }, [name, focused, color, size]);
  // #endregion

  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={{ marginBottom: -3 }}
    />
  );
};
