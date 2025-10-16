# Test Runner Secure ��ǿ����ʵ���߼����  
  
## ����  
  
���ĵ���ϸ������ test-runner-secure.cjs �ű����ĸ���ǿ���ܵ�ʵ���߼���  
  
## 1. --runInBand (�������в���) ʵ���߼�  
  
### ��������  
- �� parseArguments ������ (��1458-1460��):  
  \`\`\`javascript  
  } else if (arg === '--runInBand') {  
    parsed.runInBand = true;  
  }  
  \`\`\` 
 
### Jest �������� 
- �� buildJestArgs ������ (��1600-1602��): 
  \\\javascript 
  if (args.runInBand) { 
    jestArgs.push('--runInBand'); 
  } 
  \\\ 
 
### ������ͻ���� 
- �� buildJestArgs ������ (��1620-1623��): 
  \\\javascript 
  } else if (!args.runInBand) { 
    // ֻ���ڷǵ���ģʽ�ҷ�runInBandģʽ�²����� maxWorkers 
    jestArgs.push('--maxWorkers', args.maxWorkers.toString()); 
  } 
  \\\ 
  ��ȷ���˵�ʹ�� --runInBand ʱ��������� --maxWorkers �����������ͻ�� 
 
## 2. --listTests (�г������ļ�) ʵ���߼� 
 
### �������� 
- �� parseArguments ������ (��1460-1462��): 
  \\\javascript 
  } else if (arg === '--listTests') { 
    parsed.listTests = true; 
  } 
  \\\ 
 
### Jest �������� 
- �� buildJestArgs ������ (��1604-1606��): 
  \\\javascript 
  if (args.listTests) { 
    jestArgs.push('--listTests'); 
  } 
  \\\ 
  ��Ὣ --listTests �������ݸ� Jest��ʹ��ֻ�г������ļ�����ִ�С� 
 
## 3. --jestHelp (��ʾ Jest ����) ʵ���߼� 
 
### �������� 
- �� parseArguments ������ (��1462-1464��): 
  \\\javascript 
  } else if (arg === '--jestHelp') { 
    parsed.jestHelp = true; 
  } 
  \\\ 
 
### Jest �������� 
- �� buildJestArgs ������ (��1608-1610��): 
  \\\javascript 
  if (args.jestHelp) { 
    jestArgs.push('--help'); 
  } 
  \\\ 
  ��Ὣ --help �������ݸ� Jest��ʹ����ʾ������Ϣ�� 
 
## 4. --runTestsByPath (����ָ��·���Ĳ���) ʵ���߼� 
 
### �������� 
- �� parseArguments ������ (��1472-1474��): 
  \\\javascript 
  } else if (arg.startsWith('--runTestsByPath=')) { 
    parsed.runTestsByPath = arg.split('=')[1]; 
  } 
  \\\ 
 
### Jest �������� 
- �� buildJestArgs ������ (��1633-1635��): 
  \\\javascript 
  if (args.runTestsByPath) { 
    jestArgs.push(args.runTestsByPath); 
  } 
  \\\ 
  ��Ὣָ���Ĳ���·��ֱ�Ӵ��ݸ� Jest��ʹ��ֻ���и�·���µĲ��ԡ� 
 
## �ܽ� 
 
test-runner-secure.cjs �ű�����ǿ����ʵ����ѭ�������̣� 
 
1. **��������**: �� parseArguments ������ʶ�������в�����������Ӧ�ı�־ 
2. **Jest ��������**: �� buildJestArgs �����и��ݽ����Ĳ������� Jest ������� 
3. **������ͻ����**: ͨ�������ж�ȷ������֮�䲻���ͻ���ر��� --runInBand �� --maxWorkers 
4. **����ִ��**: ͨ�� SecureCommandExecutor ִ�й����õ� Jest ���� 
 
�������ʹ�ýű��ܹ����ش���ͬ�Ĳ�������ͬʱ���ִ���������Ϳ�ά���ԡ� 
