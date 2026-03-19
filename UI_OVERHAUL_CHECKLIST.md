# UI/UX Enterprise Overhaul Checklist

## Global Theme & Core Motion Principles
- [ ] **3D Motion & Interaction**: Implement interactive 3D tilt effects on cards, parallax scrolling backgrounds, and smooth spring-based route transitions.
- [ ] **Cursor & Lighting**: Custom dynamic cursor that interacts with "glass" elements, revealing lighting/glow effects on hover.
- [ ] **Light Theme**: "Pearl Glassmorphism" - ultra-clean white/light-gray backgrounds with soft colorful shadows, frosted glass cards, and crisp, dark typography.
- [ ] **Dark Theme**: "Obsidian & Neon" - deep space/charcoal backgrounds with vibrant glowing accents, dark glass cards, and bright, readable text.
- [ ] **Animations**: Micro-interactions on all clickable elements (buttons scale down/glow, links underline-expand), loading skeletons with shimmer, and smooth entrance staggering for list items.

## Role-Based Color Coding (Themes)
- [ ] **Admin**: **Authoritative Crimson & Obsidian**. Deep red accents indicating high clearance.
- [ ] **HR**: **Growth Emerald & Mint**. Calming, organized green accents.
- [ ] **Manager**: **Professional Sapphire & Navy**. Trustworthy, analytical blue accents.
- [ ] **Employee**: **Creative Amethyst & Lavender**. Engaging, dynamic purple accents.
- [ ] **Public/Auth**: **Cyber Neon (Cyan/Magenta)**. Striking, high-tech modern appeal.

---

## 🏗️ Implementations Chunks

### Chunk 1: Global Settings, CSS, and Core Components
- [ ] Update `globals.css` with advanced Tailwind properties, custom root variables for theming, and keyframe animations.
- [ ] Update main `layout.tsx` to handle theme providers and global background elements (animated gradients/particles).
- [ ] Create/Update custom UI components (Buttons, Inputs, Cards) with 3D hover effects (using Framer Motion or Tailwind plugins).
- [ ] Implement generic animated loading, error, and not-found pages.

### Chunk 2: Public and Auth Pages (Cyber Neon Theme)
- [ ] **Landing Page (`page.tsx`)**: Full 3D hero section, parallax scroll, glowing call-to-action buttons.
- [ ] **Auth Pages (`(auth)/login`, `(auth)/register`)**: Glassmorphic login forms floating over animated gradient backgrounds, cursor-tracking spotlight effect.
- [ ] **Onboarding & Guided Tours**: Interactive stepper with 3D transitions between steps.
- [ ] **Static Pages (Help, Support, Privacy, Terms)**: Clean typography, progressive reveal on scroll.

### Chunk 3: Employee Portal (Amethyst Theme)
- [ ] **Employee Dashboard**: Purple glowing cards, staggered entry animation, personalized greeting with smooth fade.
- [ ] **Employee Sub-pages**: Leave module, profile, notifications. All tables and lists should have hover elevation and row highlight.

### Chunk 4: Manager Portal (Sapphire Theme)
- [ ] **Manager Dashboard**: Blue authoritative data visualizations. Charts should animate on load.
- [ ] **Manager Sub-pages**: Team overview with 3D flip cards for team members, approval lists with swipe-to-approve or smooth slide animations.

### Chunk 5: HR Portal (Emerald Theme)
- [ ] **HR Dashboard**: Green growth-centric UI. Dashboard widgets tilt on cursor position.
- [ ] **HR Sub-pages**: Employee directory, payroll, recruitment. Modals for details should use spring-scale animations.

### Chunk 6: Admin Portal (Crimson Theme)
- [ ] **Admin Dashboard**: Red high-contrast monitoring widgets. Real-time data flashes.
- [ ] **Admin Sub-pages**: System settings, role management. Toggle switches and inputs should have crisp, satisfying micro-animations.
