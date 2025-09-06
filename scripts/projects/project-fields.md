# GitHub Projects v2 字段与视图建议

建议在 Organization/User 级创建一个 Project：`Superflow V1 Delivery`。

## 自定义字段（Fields）

- Status（单选，内置列）：Backlog → Ready → In Progress → In Review → Blocked → Done
- Priority（单选）：P0、P1
- Module（单选）：Studio、Flow、Inspector、Run Center、Services、Runtime、Data
- Effort（单选）：XS、S、M、L、XL
- Risk（单选）：Low、Medium、High
- Milestone（文本或迭代）：M1、M2、M3、M4

## 视图（Views）

1) Board（默认）
   - Group by: Status
   - Sort by: Priority desc, Effort asc

2) Roadmap（里程碑）
   - Group by: Milestone
   - Filter: is:open

3) By Module
   - Group by: Module
   - Filter: is:open

4) P0 Focus
   - Filter: Priority = P0 AND Status != Done
   - Sort by: Updated desc

## 自动化（可选）

配合 `.github/workflows/add-to-project.yml`：

- 当新 Issue 打上标签 `project:superflow` 时，自动加入本 Project。
- 初始 Status 设为 `Backlog`，Priority 依据标签 `priority/p0|p1` 同步（需要手工执行一次字段映射或后续手动调整）。

