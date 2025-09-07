#!/usr/bin/env python3
"""
🔗 从 AGENTS.md 生成带原始引用的 TODO.md
自动解析 AGENTS.md 中的任务并添加行号引用
"""

import re
import sys
from pathlib import Path

def parse_agents_md():
    """解析 AGENTS.md 中的 TODO 任务"""
    agents_file = Path("AGENTS.md")
    if not agents_file.exists():
        print("❌ 找不到 AGENTS.md 文件")
        return None
    
    with open(agents_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # 找到 TODO 部分的开始
    todo_start = None
    for i, line in enumerate(lines):
        if line.strip() == "## TODO":
            todo_start = i
            break
    
    if todo_start is None:
        print("❌ 找不到 TODO 部分")
        return None
    
    # 解析任务
    tasks = []
    current_priority = None
    current_epic = None
    current_epic_line = None
    
    for i in range(todo_start, len(lines)):
        line = lines[i].strip()
        line_num = i + 1
        
        # 检测优先级
        if line.startswith("### P0"):
            current_priority = "P0"
            continue
        elif line.startswith("### P1"):
            current_priority = "P1"
            continue
            
        # 检测主要任务 (Epic 级别)
        if line.startswith("- [ ]") or line.startswith("- [x]"):
            # 主任务
            status = "DONE" if line.startswith("- [x]") else "TODO"
            task_title = re.sub(r'^- \[[x ]\] ', '', line)
            
            current_epic = task_title
            current_epic_line = line_num
            
            tasks.append({
                'type': 'epic',
                'title': task_title,
                'status': status,
                'priority': current_priority,
                'line': line_num,
                'subtasks': []
            })
            
        # 检测子任务
        elif line.startswith("  - [ ]") or line.startswith("  - [x]"):
            if tasks and current_epic:
                status = "DONE" if line.startswith("  - [x]") else "TODO"
                task_title = re.sub(r'^  - \[[x ]\] ', '', line)
                
                # 提取已有的文件引用和说明
                details = ""
                if "—" in task_title:
                    parts = task_title.split("—", 1)
                    task_title = parts[0].strip()
                    details = parts[1].strip()
                
                tasks[-1]['subtasks'].append({
                    'title': task_title,
                    'status': status,
                    'line': line_num,
                    'details': details
                })
    
    return tasks

def estimate_effort(task_title):
    """根据任务标题估算工作量"""
    title_lower = task_title.lower()
    
    if any(word in title_lower for word in ['集成', '接入', '联动']):
        return "1天"
    elif any(word in title_lower for word in ['校验', '过滤', '状态条']):
        return "2天"
    elif any(word in title_lower for word in ['命令面板', '搜索', '迁移向导']):
        return "3天"
    elif any(word in title_lower for word in ['agent', '修复', '测试面板']):
        return "4天"
    elif any(word in title_lower for word in ['lsp', 'monaco', '代码页']):
        return "5天"
    else:
        return "2天"

def generate_todo_md(tasks):
    """生成 TODO.md 内容"""
    
    # 统计信息
    total_tasks = sum(len(task['subtasks']) for task in tasks)
    done_tasks = sum(len([st for st in task['subtasks'] if st['status'] == 'DONE']) for task in tasks)
    completion_rate = int(done_tasks * 100 / total_tasks) if total_tasks > 0 else 0
    
    content = f"""# 🎯 Superflow 任务清单

> 从 AGENTS.md 自动生成的任务跟踪文件，包含原始引用

## 📊 进度概览

- **总任务数**: {total_tasks}
- **已完成**: {done_tasks}  
- **进行中**: 0
- **待开始**: {total_tasks - done_tasks}
- **完成率**: {completion_rate}%

---

## 🔥 P0 任务（核心功能，优先完成）

"""
    
    # 生成 P0 任务
    p0_tasks = [task for task in tasks if task['priority'] == 'P0']
    
    for i, task in enumerate(p0_tasks, 1):
        epic_title = task['title']
        epic_line = task['line']
        
        content += f"""### {i}. {epic_title}
> 📄 原始引用: `AGENTS.md:{epic_line}` ({task['priority']} {epic_title})

"""
        
        for subtask in task['subtasks']:
            status_icon = "✅ **DONE**" if subtask['status'] == 'DONE' else "📋 **TODO**"
            effort = estimate_effort(subtask['title'])
            
            content += f"""- [ ] {status_icon} {subtask['title']}  
  负责人: - | 预计: {effort}  
  📋 引用: `AGENTS.md:{subtask['line']}`"""
            
            if subtask['details']:
                content += f"  \n  💡 详情: {subtask['details']}"
            
            content += "\n"
        
        content += "\n"
    
    # 生成 P1 任务
    content += """---

## ⭐ P1 任务（体验优化，后续完成）

"""
    
    p1_tasks = [task for task in tasks if task['priority'] == 'P1']
    
    for task in p1_tasks:
        epic_title = task['title']
        epic_line = task['line']
        
        content += f"""### {epic_title}
> 📄 原始引用: `AGENTS.md:{epic_line}` ({task['priority']} {epic_title})

"""
        
        for subtask in task['subtasks']:
            status_icon = "✅ **DONE**" if subtask['status'] == 'DONE' else "📋 **TODO**"
            effort = estimate_effort(subtask['title'])
            
            content += f"""- [ ] {status_icon} {subtask['title']}  
  负责人: - | 预计: {effort}  
  📋 引用: `AGENTS.md:{subtask['line']}`"""
            
            if subtask['details']:
                content += f"  \n  💡 详情: {subtask['details']}"
            
            content += "\n"
        
        content += "\n"
    
    # 添加使用说明
    content += """---

## 📝 任务更新日志

### 2025-09-07
- ✅ 自动生成带原始引用的 TODO.md
- ✅ 整理了 P0/P1 任务清单，包含 AGENTS.md 行号引用
- ✅ 设置了预估工期和状态跟踪
- 📋 下一步：开始执行第一个任务

---

## 🔧 使用说明

### 1. 查看任务引用
每个任务都包含 `📋 引用: AGENTS.md:行号`，可以快速跳转到原始定义

### 2. 开始任务
1. 选择一个 **📋 TODO** 状态的任务
2. 改为 **🔄 DOING** 并填写负责人
3. 开始编码

### 3. 完成任务  
1. 改为 **✅ DONE** 并填写完成时间
2. 在 AGENTS.md 对应行也勾选 `[x]`
3. 更新顶部进度概览

### 4. 重新生成 (当 AGENTS.md 更新时)
```bash
python3 scripts/projects/generate-todo-with-refs.py
```

### 5. 同步到 GitHub (可选)
```bash
./scripts/projects/quick-github-sync.sh
```
"""
    
    return content

def main():
    print("🔗 从 AGENTS.md 生成带引用的 TODO.md")
    
    # 解析 AGENTS.md
    tasks = parse_agents_md()
    if not tasks:
        return
    
    print(f"✅ 解析到 {len(tasks)} 个主要任务")
    
    # 生成 TODO.md
    content = generate_todo_md(tasks)
    
    # 写入文件
    with open("TODO.md", 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ 生成完成: TODO.md")
    print("\n📋 下一步:")
    print("1. 查看 TODO.md 选择第一个任务")
    print("2. 根据引用查看 AGENTS.md 中的详细说明")
    print("3. 开始编码!")

if __name__ == "__main__":
    main()